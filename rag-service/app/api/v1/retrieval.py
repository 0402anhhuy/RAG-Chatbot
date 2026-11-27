"""Workspace-scoped retrieval endpoint."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.core.context import request_id_context
from app.core.errors import ApiError, ErrorCode
from app.core.metrics import METRICS
from app.core.principal import Principal, ensure_workspace_allowed, get_principal
from app.core.provider_errors import ProviderError, provider_api_error
from app.core.security import require_api_key

router = APIRouter(tags=["retrieval"], dependencies=[Depends(require_api_key)])


class RetrievalRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(..., min_length=1, max_length=2000)
    workspace_id: str = Field(..., alias="workspaceId", min_length=1, max_length=200)
    document_ids: list[str] | None = Field(default=None, alias="documentIds", max_length=100)


@router.post("/retrieval/search")
async def search(
    request: Request,
    payload: Annotated[RetrievalRequest, Body(...)],
    principal: Annotated[Principal, Depends(get_principal)],
) -> JSONResponse:
    ensure_workspace_allowed(principal, payload.workspace_id)
    settings = request.app.state.settings
    try:
        results = await request.app.state.work_gate.run(
            request.app.state.retriever.search,
            payload.query,
            workspace_id=payload.workspace_id,
            document_ids=payload.document_ids,
            timeout=settings.app.request_timeout_seconds,
        )
    except ProviderError as exc:
        METRICS.inc("rag_retrieval_requests_total", labels={"status": "provider_error"})
        raise provider_api_error(exc) from exc
    except RuntimeError as exc:
        METRICS.inc("rag_retrieval_requests_total", labels={"status": "error"})
        raise ApiError(
            ErrorCode.INTERNAL_ERROR,
            "RAG retrieval provider failed",
            status_code=502,
        ) from exc

    METRICS.inc("rag_retrieval_requests_total", labels={"status": "ok"})
    METRICS.observe("rag_retrieval_results", len(results))

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": [
                {
                    "document_id": result.document_id,
                    "chunk_id": result.chunk_id,
                    "text": result.content,
                    "score": result.score,
                    "source": result.metadata.get("source") or result.metadata.get("filename"),
                    "page": result.metadata.get("page_number"),
                }
                for result in results
            ],
            "request_id": request_id_context.get(),
        },
    )
