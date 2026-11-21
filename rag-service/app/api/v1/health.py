"""Public liveness and readiness probes."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Request, Response

router = APIRouter(tags=["health"])


@router.get("/health/liveness")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/readiness")
async def readiness(request: Request, response: Response) -> dict[str, str]:
    # The service owns no database: readiness means its configuration, indexes and
    # the backend that stores the RAG catalog are all reachable.
    registry = request.app.state.backend
    ready = bool(request.app.state.ready)
    if ready:
        try:
            await asyncio.to_thread(registry.list_documents, status="ready")
        except Exception:  # noqa: BLE001 - probes must never raise
            ready = False
    if not ready:
        response.status_code = 503
        return {"status": "not_ready"}
    return {"status": "ready"}
