"""Flashcard and exam generation based only on selected workspace documents."""

from __future__ import annotations

import asyncio
import json
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.context import request_id_context
from app.core.errors import ApiError, ErrorCode
from app.core.security import require_api_key
from app.rag.factories.llm_factory import LLMFactory
from app.rag.ingest_worker import chunk_from_record
from app.rag.types import DocumentChunk

router = APIRouter(tags=["study"], dependencies=[Depends(require_api_key)])


class StudyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    workspace_id: str = Field(..., alias="workspaceId", min_length=1, max_length=200)
    document_id: str | None = Field(default=None, alias="documentId", min_length=1, max_length=200)
    document_ids: list[str] | None = Field(default=None, alias="documentIds", max_length=100)
    max_items: int = Field(default=20, alias="maxItems", ge=1, le=50)

    @model_validator(mode="after")
    def require_documents(self) -> StudyRequest:
        if not self.document_id and not self.document_ids:
            raise ValueError("documentId or documentIds is required")
        return self


def _json_array(text: str) -> list[dict[str, Any]]:
    start = text.find("[")
    if start < 0:
        raise ValueError("model did not return a JSON array")
    value, _ = json.JSONDecoder().raw_decode(text[start:])
    if not isinstance(value, list):
        raise ValueError("model did not return a JSON array")
    return [item for item in value if isinstance(item, dict)]


def _make_llm(request: Request) -> Any:
    settings = request.app.state.settings.llm
    return LLMFactory.create(
        settings.provider,
        model_name=settings.model,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        timeout=settings.request_timeout,
        max_retries=settings.max_retries,
        api_key=settings.api_key.get_secret_value(),
        base_url=settings.base_url,
    )


def _generate_items(
    *,
    tool: Literal["flashcards", "exams"],
    chunks: list[DocumentChunk],
    max_items: int,
    llm: Any,
) -> list[dict[str, Any]]:
    source_by_id = {chunk.chunk_id: chunk for chunk in chunks}
    context = "\n\n".join(
        f"[source_chunk_id={chunk.chunk_id}; page={chunk.page_number or 'N/A'}]\n{chunk.content}" for chunk in chunks
    )[:12000]
    if tool == "flashcards":
        requirements = (
            f"Create up to {max_items} high-quality study flashcards from the context. "
            'Return only a JSON array of objects with "question", "answer", and "source_chunk_id". '
            "Use only facts in the context. Skip unsupported cards."
        )
    else:
        requirements = (
            f"Create up to {max_items} multiple-choice questions from the context. "
            'Return only a JSON array of objects with "question", "options" (exactly A, B, C, D), '
            '"correct_answer" (one of A, B, C, D), and "source_chunk_id". '
            "All four options must be distinct. Use only facts in the context."
        )
    prompt = f"{requirements}\n\n<context>\n{context}\n</context>"

    for _ in range(2):
        try:
            candidates = _json_array(llm.complete(prompt))
        except ValueError:
            candidates = []
        valid: list[dict[str, Any]] = []
        for item in candidates:
            chunk = source_by_id.get(str(item.get("source_chunk_id", "")))
            if chunk is None:
                continue
            if tool == "flashcards":
                if not all(isinstance(item.get(key), str) and item[key].strip() for key in ("question", "answer")):
                    continue
            else:
                options = item.get("options")
                if (
                    not isinstance(item.get("question"), str)
                    or not isinstance(options, dict)
                    or set(options) != {"A", "B", "C", "D"}
                    or any(not isinstance(value, str) or not value.strip() for value in options.values())
                    or len(set(options.values())) != 4
                    or item.get("correct_answer") not in {"A", "B", "C", "D"}
                ):
                    continue
            valid.append(
                {
                    **item,
                    "document_id": chunk.document_id,
                    "chunk_id": chunk.chunk_id,
                    "page": chunk.page_number,
                }
            )
            if len(valid) >= max_items:
                break
        if valid:
            return valid
        prompt += "\nThe previous response was invalid. Return a JSON array with valid source_chunk_id values."
    raise ValueError("model did not return valid study items")


async def _document_context(request: Request, workspace_id: str, document_ids: list[str]) -> dict[str, Any]:
    """Ask the backend which selected documents are ready and return their chunks."""
    return await asyncio.to_thread(
        request.app.state.backend.document_context,
        workspace_id,
        document_ids,
    )


async def _generate(
    request: Request,
    payload: StudyRequest,
    tool: Literal["flashcards", "exams"],
) -> JSONResponse:
    requested_ids = set(payload.document_ids or [])
    if payload.document_id:
        requested_ids.add(payload.document_id)
    # Document catalog and chunk text are owned by the backend; ask it for the
    # ready documents of this workspace and their indexed chunks.
    context = await _document_context(request, payload.workspace_id, sorted(requested_ids))
    ready_ids = set(context["readyDocumentIds"])
    if ready_ids != requested_ids:
        raise ApiError(
            ErrorCode.NOT_FOUND,
            "A selected document was not found or is not ready in this workspace",
            status_code=404,
        )
    chunks = [chunk_from_record(record) for record in context.get("chunks", [])]
    if not chunks:
        raise ApiError(ErrorCode.NOT_FOUND, "Selected documents contain no indexed chunks", status_code=404)
    try:
        items = await asyncio.to_thread(
            _generate_items,
            tool=tool,
            chunks=chunks,
            max_items=payload.max_items,
            llm=_make_llm(request),
        )
    except RuntimeError as exc:
        raise ApiError(ErrorCode.INTERNAL_ERROR, "Study generation provider failed", status_code=502) from exc
    except ValueError as exc:
        raise ApiError(
            ErrorCode.INTERNAL_ERROR,
            "Study provider returned invalid structured output",
            status_code=502,
        ) from exc

    data_key = "flashcards" if tool == "flashcards" else "questions"
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": {
                "workspace_id": payload.workspace_id,
                "document_ids": sorted(ready_ids),
                data_key: items,
            },
            "request_id": request_id_context.get(),
        },
    )


@router.post("/study/flashcards")
async def create_flashcards(request: Request, payload: Annotated[StudyRequest, Body(...)]) -> JSONResponse:
    return await _generate(request, payload, "flashcards")


@router.post("/study/exams")
async def create_exam(request: Request, payload: Annotated[StudyRequest, Body(...)]) -> JSONResponse:
    return await _generate(request, payload, "exams")
