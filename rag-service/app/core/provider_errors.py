"""Typed provider failures and their public API mapping.

Provider SDKs raise a mix of HTTP status codes and transport errors. Normalising
them here keeps the HTTP surface stable: callers see 429 with ``Retry-After`` for
rate limits, 504 for timeouts, and a generic 502 for everything else, never the
raw provider message (which can contain endpoint or key fragments).
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Literal

from app.core.errors import ApiError, ErrorCode

ProviderErrorKind = Literal[
    "rate_limit",
    "auth",
    "timeout",
    "context_overflow",
    "unavailable",
    "bad_response",
]


class ProviderError(RuntimeError):
    def __init__(
        self,
        kind: ProviderErrorKind,
        message: str,
        *,
        retry_after: float | None = None,
        provider: str | None = None,
    ) -> None:
        super().__init__(message)
        self.kind = kind
        self.retry_after = retry_after
        self.provider = provider


def retry_after_from_headers(headers: Mapping[str, str] | None) -> float | None:
    raw = headers.get("Retry-After") if headers else None
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def provider_error_from_http(
    status: int,
    *,
    provider: str,
    action: str = "Provider",
    retry_after: float | None = None,
) -> ProviderError:
    if status == 429:
        return ProviderError("rate_limit", f"{action} rate limited", provider=provider, retry_after=retry_after)
    if status in {401, 403}:
        return ProviderError("auth", f"{action} rejected credentials", provider=provider)
    if status == 408:
        return ProviderError("timeout", f"{action} timed out", provider=provider)
    if status in {413, 422}:
        return ProviderError("context_overflow", f"{action} rejected the request size", provider=provider)
    if status >= 500:
        return ProviderError("unavailable", f"{action} is unavailable", provider=provider)
    return ProviderError("bad_response", f"{action} rejected the request", provider=provider)


def provider_api_error(exc: ProviderError) -> ApiError:
    """Translate a typed provider failure into the public error contract."""
    details: dict[str, object] = {"provider_kind": exc.kind}
    if exc.provider:
        details["provider"] = exc.provider
    headers: dict[str, str] = {}
    if exc.retry_after is not None:
        retry_after = max(1, int(round(exc.retry_after)))
        details["retry_after_seconds"] = retry_after
        headers["Retry-After"] = str(retry_after)

    if exc.kind == "rate_limit":
        return ApiError(
            ErrorCode.RATE_LIMITED,
            "RAG provider rate limit reached",
            status_code=429,
            details=details,
            headers=headers,
        )
    if exc.kind == "timeout":
        return ApiError(
            ErrorCode.INTERNAL_ERROR,
            "RAG provider timed out",
            status_code=504,
            details=details,
            headers=headers,
        )
    return ApiError(
        ErrorCode.INTERNAL_ERROR,
        "RAG provider failed",
        status_code=502,
        details=details,
        headers=headers,
    )


__all__ = [
    "ProviderError",
    "ProviderErrorKind",
    "provider_api_error",
    "provider_error_from_http",
    "retry_after_from_headers",
]
