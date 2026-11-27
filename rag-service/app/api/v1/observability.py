"""Prometheus text exposition for the in-process metrics registry."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from app.core.metrics import METRICS
from app.core.security import require_api_key

router = APIRouter(tags=["metrics"], dependencies=[Depends(require_api_key)])


@router.get("/metrics")
async def metrics() -> PlainTextResponse:
    return PlainTextResponse(
        METRICS.render(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )
