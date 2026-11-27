from __future__ import annotations

from app.core.errors import ErrorCode
from app.core.provider_errors import (
    ProviderError,
    provider_api_error,
    provider_error_from_http,
    retry_after_from_headers,
)


def test_rate_limit_maps_to_429_with_retry_after() -> None:
    error = provider_api_error(
        ProviderError("rate_limit", "limited", retry_after=1.4, provider="openai")
    )

    assert error.status_code == 429
    assert error.code == ErrorCode.RATE_LIMITED
    assert error.headers["Retry-After"] == "1"
    assert error.details["provider_kind"] == "rate_limit"
    assert error.details["provider"] == "openai"


def test_timeout_maps_to_504() -> None:
    error = provider_api_error(ProviderError("timeout", "timed out"))

    assert error.status_code == 504
    assert error.code == ErrorCode.INTERNAL_ERROR


def test_other_provider_failures_map_to_502_without_leaking_message() -> None:
    error = provider_api_error(ProviderError("auth", "key sk-secret rejected"))

    assert error.status_code == 502
    assert "sk-secret" not in error.message
    assert error.details["provider_kind"] == "auth"


def test_http_status_mapping() -> None:
    assert provider_error_from_http(429, provider="p").kind == "rate_limit"
    assert provider_error_from_http(401, provider="p").kind == "auth"
    assert provider_error_from_http(403, provider="p").kind == "auth"
    assert provider_error_from_http(408, provider="p").kind == "timeout"
    assert provider_error_from_http(413, provider="p").kind == "context_overflow"
    assert provider_error_from_http(503, provider="p").kind == "unavailable"
    assert provider_error_from_http(400, provider="p").kind == "bad_response"


def test_retry_after_parsing() -> None:
    assert retry_after_from_headers({"Retry-After": "2.5"}) == 2.5
    assert retry_after_from_headers({"Retry-After": "soon"}) is None
    assert retry_after_from_headers(None) is None
