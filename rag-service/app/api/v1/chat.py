"""Chat and streaming endpoints for the RAG service."""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncGenerator
from typing import Annotated, Literal

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.context import request_id_context
from app.core.errors import ApiError, ErrorCode
from app.core.security import require_api_key
from app.rag.factories.llm_factory import LLMFactory
from app.rag.graph.workflow import RAGWorkflow

router = APIRouter(tags=["chat"], dependencies=[Depends(require_api_key)])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"] = "user"
    content: str = Field(..., min_length=1, max_length=20000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(..., min_length=1, max_length=2000)
    workspace_id: str = Field(..., alias="workspaceId", min_length=1, max_length=200)
    document_ids: list[str] | None = Field(default=None, alias="documentIds", max_length=100)
    conversation_id: str | None = None
    chat_history: list[ChatMessage] = Field(default_factory=list)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("query must not be empty")
        return normalized

    @field_validator("chat_history")
    @classmethod
    def validate_history(cls, value: list[ChatMessage]) -> list[ChatMessage]:
        if len(value) > 20:
            raise ValueError("chat_history must contain at most 20 messages")
        return value


def _history_strings(history: list[ChatMessage]) -> list[str]:
    messages: list[str] = []
    for message in history:
        messages.append(f"{message.role}: {message.content}")
    return messages


def _run_chat_workflow_sync(request: Request, payload: ChatRequest) -> dict[str, object]:
    started = time.perf_counter()
    settings = request.app.state.settings
    llm = LLMFactory.create(
        settings.llm.provider,
        model_name=settings.llm.model,
        temperature=settings.llm.temperature,
        max_tokens=settings.llm.max_tokens,
        timeout=settings.llm.request_timeout,
        max_retries=settings.llm.max_retries,
        api_key=settings.llm.api_key.get_secret_value(),
        base_url=settings.llm.base_url,
    )
    workflow = RAGWorkflow(
        llm=llm,
        prompt_templates={
            "query_rewrite": settings.prompts.query_rewrite,
            "grade_documents": settings.prompts.grade_documents,
            "system_qa": settings.prompts.system_qa,
            "fallback": settings.prompts.fallback,
        },
        max_rewrite_retries=settings.graph.max_rewrite_retries,
    )
    history = _history_strings(payload.chat_history)
    state = workflow.run(
        payload.query,
        retrieval_fn=lambda query: request.app.state.retriever.search(
            query,
            workspace_id=payload.workspace_id,
            document_ids=payload.document_ids,
        ),
        history=history,
        max_context_chars=settings.graph.context_max_chars,
        truncation_strategy=settings.graph.truncation_strategy,
    )
    answer = state.answer or state.fallback_answer
    citations = [
        {
            "document_id": citation.document_id,
            "chunk_id": citation.chunk_id,
            "file_name": citation.source,
            "page": citation.page_number,
            "score": citation.score,
            "snippet": citation.snippet,
        }
        for citation in state.citations
    ]
    execution_time_ms = max(1, int(round((time.perf_counter() - started) * 1000)))
    return {
        "answer": answer,
        "citations": citations,
        "execution_time_ms": execution_time_ms,
    }


async def _run_chat_workflow(request: Request, payload: ChatRequest) -> dict[str, object]:
    try:
        return await asyncio.to_thread(_run_chat_workflow_sync, request, payload)
    except RuntimeError as exc:
        raise ApiError(
            ErrorCode.INTERNAL_ERROR,
            "RAG model or retrieval provider failed",
            status_code=502,
        ) from exc


@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    payload: Annotated[ChatRequest, Body(...)],
) -> JSONResponse:
    result = await _run_chat_workflow(request, payload)
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": result,
            "request_id": request_id_context.get(),
        },
    )


@router.post("/chat/stream")
async def chat_stream(
    request: Request,
    payload: Annotated[ChatRequest, Body(...)],
) -> StreamingResponse:
    async def generate() -> AsyncGenerator[str, None]:
        result = await _run_chat_workflow(request, payload)
        answer = str(result["answer"])
        citations = result["citations"]

        yield "event: metadata\n"
        yield (
            "data: "
            + json.dumps(
                {
                    "conversation_id": payload.conversation_id or "default-conversation",
                    "request_id": request_id_context.get(),
                    "status": "retrieving",
                }
            )
            + "\n\n"
        )

        chunks = answer.split()
        for chunk in chunks:
            yield "event: token\n"
            yield "data: " + json.dumps({"content": f"{chunk} "}) + "\n\n"

        if citations:
            yield "event: citations\n"
            yield "data: " + json.dumps(citations) + "\n\n"

        yield "event: done\n"
        yield (
            "data: "
            + json.dumps(
                {
                    "finish_reason": "stop",
                    "execution_time_ms": result["execution_time_ms"],
                }
            )
            + "\n\n"
        )

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
