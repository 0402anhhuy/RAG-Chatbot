"""API key authentication for protected service routes."""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Header, Request

from app.core.errors import ApiError, ErrorCode


async def require_api_key(
    request: Request,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> None:
    settings = request.app.state.settings.security
    if not settings.enabled and request.app.state.settings.app.env in {"development", "test"}:
        return

    submitted = x_api_key or ""
    expected_keys = [
        settings.api_key.get_secret_value(),
        *(value.get_secret_value() for value in settings.api_keys.values()),
    ]
    valid = False
    for expected in expected_keys:
        if expected:
            valid = secrets.compare_digest(submitted, expected) or valid
    if not valid:
        raise ApiError(
            ErrorCode.AUTH_ERROR,
            "A valid API key is required",
            status_code=401,
            details={},
        )
