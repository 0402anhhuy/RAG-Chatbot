"""Resolve per-project/per-user LLM provider config from the Spring backend."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass

import httpx

from config.settings import ProviderConfigSettings

logger = logging.getLogger(__name__)

_PROVIDER_ALIASES = {
    "FPT_CLOUD": "fpt",
    "OPENAI": "openai",
    "ANTHROPIC": "anthropic",
    "GOOGLE": "gemini",
}


@dataclass(frozen=True, slots=True)
class ResolvedProvider:
    provider: str
    model: str
    api_key: str
    base_url: str | None
    endpoint_code: str | None
    project_provider: str
    purpose: str

    def cache_label(self) -> str:
        return f"{self.project_provider}:{self.model}"


class ProviderConfigClient:
    """Small sync client with TTL cache and a failure circuit breaker.

    Failures never block chat: the caller falls back to the env-configured
    provider, and the circuit breaker prevents repeated slow calls.
    """

    def __init__(
        self,
        settings: ProviderConfigSettings,
        *,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.settings = settings
        self._client = httpx.Client(
            base_url=settings.base_url,
            timeout=settings.timeout_seconds,
            transport=transport,
            headers={
                "X-Internal-Token": settings.internal_token.get_secret_value(),
                "Accept": "application/json",
            },
        )
        self._lock = threading.Lock()
        self._cache: dict[tuple[str | None, str | None, str], tuple[float, ResolvedProvider]] = {}
        self._blocked_until = 0.0

    def resolve(
        self,
        project_id: str | None,
        user_id: str | None,
        purpose: str = "chat",
    ) -> ResolvedProvider | None:
        if not self.settings.enabled:
            return None
        if not project_id and not user_id:
            return None
        now = time.monotonic()
        if now < self._blocked_until:
            return None
        key = (project_id, user_id, purpose)
        with self._lock:
            cached = self._cache.get(key)
            if cached is not None and cached[0] > now:
                return cached[1]

        params: dict[str, str] = {"purpose": purpose}
        if project_id:
            params["projectId"] = project_id
        if user_id:
            params["userId"] = user_id
        try:
            response = self._client.get("/api/internal/rag/providers/resolve", params=params)
        except httpx.HTTPError as exc:
            self._trip_breaker(exc)
            return None

        if response.status_code == 404:
            return None
        if response.status_code >= 500 or response.status_code == 401:
            logger.warning("provider_resolve_failed", extra={"extra_fields": {"status": response.status_code}})
            self._trip_breaker(None)
            return None
        if response.status_code != 200:
            logger.warning(
                "provider_resolve_rejected",
                extra={"extra_fields": {"status": response.status_code}},
            )
            return None

        try:
            payload = response.json()
            resolved = _parse(payload, purpose)
        except (ValueError, TypeError, KeyError):
            logger.warning("provider_resolve_invalid_payload")
            return None

        expires_at = now + max(0, self.settings.cache_ttl_seconds)
        with self._lock:
            self._cache[key] = (expires_at, resolved)
        return resolved

    def invalidate(self) -> None:
        with self._lock:
            self._cache.clear()

    def close(self) -> None:
        self._client.close()

    def _trip_breaker(self, exc: BaseException | None) -> None:
        with self._lock:
            self._blocked_until = time.monotonic() + max(0, self.settings.failure_cooldown_seconds)
        logger.warning(
            "provider_resolve_unavailable",
            extra={"extra_fields": {"error": type(exc).__name__ if exc else "unknown"}},
        )


def _parse(payload: object, purpose: str) -> ResolvedProvider:
    if not isinstance(payload, dict):
        raise TypeError("provider config must be an object")
    provider_type = str(payload.get("provider") or "").upper()
    provider = _PROVIDER_ALIASES.get(provider_type)
    if provider is None:
        raise ValueError(f"unsupported provider type: {provider_type}")
    api_key = str(payload.get("apiKey") or "").strip()
    model = str(payload.get("model") or "").strip()
    if not api_key or not model:
        raise ValueError("provider config is missing apiKey/model")
    base_url = payload.get("baseUrl")
    return ResolvedProvider(
        provider=provider,
        model=model,
        api_key=api_key,
        base_url=str(base_url).rstrip("/") if isinstance(base_url, str) and base_url else None,
        endpoint_code=payload.get("endpointCode") if isinstance(payload.get("endpointCode"), str) else None,
        project_provider=provider_type,
        purpose=purpose,
    )


__all__ = ["ProviderConfigClient", "ResolvedProvider"]
