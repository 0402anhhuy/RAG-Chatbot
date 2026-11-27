"""Chat and streaming endpoints for the RAG service."""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncGenerator
from typing import Annotated, Literal, cast

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.context import request_id_context
from app.core.errors import ApiError, ErrorCode
from app.core.metrics import METRICS
from app.core.principal import Principal, ensure_workspace_allowed, get_principal
from app.core.provider_errors import ProviderError, provider_api_error
from app.core.runtime import WorkGate
from app.core.security import require_api_key
from app.rag.graph.workflow import RAGWorkflow
from app.rag.llm_resolver import ChatModelResolution, create_chat_model, usage_of
from app.rag.types import RAGState

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
    project_id: str | None = Field(default=None, alias="projectId", max_length=64)
    user_id: str | None = Field(default=None, alias="userId", max_length=64)
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


def _make_workflow(request: Request, payload: ChatRequest) -> tuple[RAGWorkflow, ChatModelResolution]:
    settings = request.app.state.settings
    resolution = create_chat_model(
        request,
        project_id=payload.project_id,
        user_id=payload.user_id,
    )
    workflow = RAGWorkflow(
        llm=resolution.model,
        prompt_templates={
            "query_rewrite": settings.prompts.query_rewrite,
            "grade_documents": settings.prompts.grade_documents,
            "system_qa": settings.prompts.system_qa,
            "fallback": settings.prompts.fallback,
        },
        max_rewrite_retries=settings.graph.max_rewrite_retries,
        skip_rewrite_max_words=settings.graph.skip_rewrite_max_words,
        rewrite_cache_ttl_seconds=settings.graph.rewrite_cache_ttl_seconds,
        grade_batch=settings.graph.grade_batch,
        grade_batch_size=settings.graph.grade_batch_size,
    )
    return workflow, resolution


def _prepare_chat_sync(
    request: Request,
    payload: ChatRequest,
) -> tuple[RAGState, RAGWorkflow, ChatModelResolution]:
    workflow, resolution = _make_workflow(request, payload)
    history = _history_strings(payload.chat_history)
    state, _llm = workflow.prepare(
        payload.query,
        retrieval_fn=lambda query: request.app.state.retriever.search(
            query,
            workspace_id=payload.workspace_id,
            document_ids=payload.document_ids,
        ),
        history=history,
    )
    return state, workflow, resolution


def _run_chat_workflow_sync(request: Request, payload: ChatRequest) -> dict[str, object]:
    started = time.perf_counter()
    settings = request.app.state.settings
    workflow, resolution = _make_workflow(request, payload)
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
    labels = {"provider": resolution.provider}
    METRICS.inc("rag_chat_workflow_total", labels={"status": state.status, **labels})
    METRICS.observe("rag_chat_workflow_duration_seconds", execution_time_ms / 1000.0, labels=labels)
    METRICS.observe("rag_chat_citations", len(citations), labels=labels)
    METRICS.observe("rag_chat_rewrite_retries", state.retries, labels=labels)
    return {
        "answer": answer,
        "citations": citations,
        "execution_time_ms": execution_time_ms,
        "provider": resolution.provider,
        "model": resolution.model_name,
        "usage": usage_of(resolution),
    }


async def _run_chat_workflow(request: Request, payload: ChatRequest) -> dict[str, object]:
    settings = request.app.state.settings
    labels = {"provider": settings.llm.provider}
    gate = cast(WorkGate, request.app.state.work_gate)
    try:
        return await gate.run(
            _run_chat_workflow_sync,
            request,
            payload,
            timeout=settings.app.request_timeout_seconds,
        )
    except ProviderError as exc:
        METRICS.inc("rag_chat_workflow_total", labels={"status": "provider_error", **labels})
        raise provider_api_error(exc) from exc
    except RuntimeError as exc:
        METRICS.inc("rag_chat_workflow_total", labels={"status": "error", **labels})
        raise ApiError(
            ErrorCode.INTERNAL_ERROR,
            "RAG model or retrieval provider failed",
            status_code=502,
        ) from exc


async def _prepare_chat(
    request: Request,
    payload: ChatRequest,
) -> tuple[RAGState, RAGWorkflow, ChatModelResolution]:
    settings = request.app.state.settings
    labels = {"provider": settings.llm.provider}
    gate = cast(WorkGate, request.app.state.work_gate)
    try:
        return await gate.run(
            _prepare_chat_sync,
            request,
            payload,
            timeout=settings.app.request_timeout_seconds,
        )
    except ProviderError as exc:
        METRICS.inc("rag_chat_workflow_total", labels={"status": "provider_error", **labels})
        raise provider_api_error(exc) from exc
    except RuntimeError as exc:
        METRICS.inc("rag_chat_workflow_total", labels={"status": "error", **labels})
        raise ApiError(
            ErrorCode.INTERNAL_ERROR,
            "RAG model or retrieval provider failed",
            status_code=502,
        ) from exc


@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    payload: Annotated[ChatRequest, Body(...)],
    principal: Annotated[Principal, Depends(get_principal)],
) -> JSONResponse:
    ensure_workspace_allowed(principal, payload.workspace_id)
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
    principal: Annotated[Principal, Depends(get_principal)],
) -> StreamingResponse:
    ensure_workspace_allowed(principal, payload.workspace_id)
    settings = request.app.state.settings
    started = time.perf_counter()
    state, workflow, resolution = await _prepare_chat(request, payload)

    async def generate() -> AsyncGenerator[str, None]:
        yield "event: metadata\n"
        yield (
            "data: "
            + json.dumps(
                {
                    "conversation_id": payload.conversation_id or "default-conversation",
                    "request_id": request_id_context.get(),
                    "provider": resolution.provider,
                    "model": resolution.model_name,
                    "status": "retrieving" if state.status == "ready" else state.status,
                }
            )
            + "\n\n"
        )

        if state.status == "fallback" and state.fallback_answer:
            # Fallback is already a complete answer; yield it as one token.
            yield "event: token\n"
            yield "data: " + json.dumps({"content": state.fallback_answer}) + "\n\n"
        else:
            stream = workflow.stream(
                state,
                max_context_chars=settings.graph.context_max_chars,
                truncation_strategy=settings.graph.truncation_strategy,
            )
            try:
                while True:
                    if await request.is_disconnected():
                        break
                    pending = asyncio.create_task(asyncio.to_thread(next, stream, None))
                    while True:
                        try:
                            piece = await asyncio.wait_for(asyncio.shield(pending), timeout=15)
                            break
                        except TimeoutError:
                            yield ": ping\n\n"
                    if piece is None:
                        break
                    yield "event: token\n"
                    yield "data: " + json.dumps({"content": piece}) + "\n\n"
            except ProviderError as exc:
                METRICS.inc(
                    "rag_chat_workflow_total",
                    labels={"status": "provider_error", "provider": resolution.provider},
                )
                yield "event: error\n"
                yield "data: " + json.dumps({"message": str(exc), "kind": exc.kind}) + "\n\n"
                return
            except Exception:  # noqa: BLE001 - stream boundary
                METRICS.inc(
                    "rag_chat_workflow_total",
                    labels={"status": "error", "provider": resolution.provider},
                )
                yield "event: error\n"
                yield "data: " + json.dumps({"message": "Stream failed"}) + "\n\n"
                return

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
        if citations:
            yield "event: citations\n"
            yield "data: " + json.dumps(citations) + "\n\n"

        execution_time_ms = max(1, int(round((time.perf_counter() - started) * 1000)))
        usage = usage_of(resolution)
        METRICS.inc(
            "rag_chat_workflow_total",
            labels={"status": state.status, "provider": resolution.provider},
        )
        METRICS.observe(
            "rag_chat_workflow_duration_seconds",
            execution_time_ms / 1000.0,
            labels={"provider": resolution.provider},
        )
        METRICS.observe("rag_chat_citations", len(citations), labels={"provider": resolution.provider})
        yield "event: done\n"
        yield (
            "data: "
            + json.dumps(
                {
                    "finish_reason": "stop",
                    "execution_time_ms": execution_time_ms,
                    "provider": resolution.provider,
                    "model": resolution.model_name,
                    "usage": usage,
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
