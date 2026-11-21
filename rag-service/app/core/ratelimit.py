"""Process-local and Redis-backed fixed-window rate limiting middleware."""

from __future__ import annotations

import hashlib
import logging
import time
from collections.abc import Awaitable
from typing import Protocol, cast

from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from redis.exceptions import RedisError
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.errors import ErrorCode, error_payload
from config.settings import RateLimitSettings

logger = logging.getLogger(__name__)
REDIS_INCREMENT_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('TTL', KEYS[1])}
"""


class RateLimitStore(Protocol):
    async def consume(self, client_key: str, now: float, limit: int, window_seconds: int) -> tuple[bool, int]: ...

    async def close(self) -> None: ...


class MemoryRateLimitStore:
    def __init__(self) -> None:
        self._windows: dict[str, tuple[int, int]] = {}

    async def consume(self, client_key: str, now: float, limit: int, window_seconds: int) -> tuple[bool, int]:
        window = int(now // window_seconds)
        count_window, count = self._windows.get(client_key, (window, 0))
        count = count + 1 if count_window == window else 1
        self._windows[client_key] = (window, count)
        if len(self._windows) > 10_000:
            self._windows = {key: value for key, value in self._windows.items() if value[0] >= window - 1}
        retry_after = max(1, int((window + 1) * window_seconds - now))
        return count <= limit, retry_after

    async def close(self) -> None:
        self._windows.clear()


class RedisRateLimitStore:
    def __init__(self, redis_url: str) -> None:
        self._redis: Redis = Redis.from_url(
            redis_url,
            decode_responses=False,
            socket_connect_timeout=1,
            socket_timeout=1,
        )

    async def consume(self, client_key: str, now: float, limit: int, window_seconds: int) -> tuple[bool, int]:
        window = int(now // window_seconds)
        hashed_key = hashlib.sha256(client_key.encode("utf-8")).hexdigest()
        redis_key = f"rag-service:rate-limit:{window}:{hashed_key}"
        pending_result = self._redis.eval(REDIS_INCREMENT_SCRIPT, 1, redis_key, str(window_seconds))
        result = await cast(Awaitable[list[int]], pending_result)
        count, ttl = int(result[0]), int(result[1])
        return count <= limit, max(ttl, 1)

    async def close(self) -> None:
        await self._redis.aclose()


class RateLimitMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        settings: RateLimitSettings,
        store: RateLimitStore | None = None,
    ) -> None:
        self.app = app
        self.settings = settings
        if store is not None:
            self.store = store
        elif not settings.enabled or settings.backend == "memory":
            self.store = MemoryRateLimitStore()
        else:
            self.store = RedisRateLimitStore(settings.redis_url)

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        path = scope.get("path", "")
        if scope.get("type") != "http" or not self.settings.enabled or not path.startswith("/api/"):
            await self.app(scope, receive, send)
            return

        client = scope.get("client")
        client_key = str(client[0]) if client else "unknown"
        try:
            allowed, retry_after = await self.store.consume(
                client_key,
                time.time(),
                self.settings.requests,
                self.settings.window_seconds,
            )
        except RedisError:
            logger.error("rate_limit_backend_unavailable", extra={"extra_fields": {"backend": "redis"}})
            response = JSONResponse(
                status_code=503,
                content=error_payload(
                    ErrorCode.RATE_LIMIT_BACKEND_ERROR,
                    "Rate limiting is temporarily unavailable",
                ),
            )
            await response(scope, receive, send)
            return

        if not allowed:
            response = JSONResponse(
                status_code=429,
                content=error_payload(
                    ErrorCode.RATE_LIMITED,
                    "Request rate limit exceeded",
                    {"retry_after_seconds": retry_after},
                ),
                headers={"Retry-After": str(retry_after)},
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)

    async def close(self) -> None:
        await self.store.close()
