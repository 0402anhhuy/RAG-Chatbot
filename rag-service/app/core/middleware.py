"""ASGI middleware for validated request IDs and request-level access logs."""

from __future__ import annotations

import logging
import time
import uuid

from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.context import request_id_context
from app.core.errors import ErrorCode, error_payload

logger = logging.getLogger(__name__)


def _request_id(headers: list[tuple[bytes, bytes]], header_name: bytes) -> str:
    raw_value = next((value for name, value in headers if name.lower() == header_name), b"")
    try:
        return str(uuid.UUID(raw_value.decode("ascii")))
    except (UnicodeDecodeError, ValueError, AttributeError):
        return str(uuid.uuid4())


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp, header_name: str = "X-Request-ID") -> None:
        self.app = app
        self.header_name = header_name.encode("ascii").lower()

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _request_id(scope.get("headers", []), self.header_name)
        state = scope.setdefault("state", {})
        state["request_id"] = request_id
        token = request_id_context.set(request_id)
        started = time.perf_counter()
        status_code = 500

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
                headers = [
                    (name, value) for name, value in message.get("headers", []) if name.lower() != self.header_name
                ]
                headers.append((self.header_name, request_id.encode("ascii")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception as exc:
            status_code = 500
            logger.error(
                "unhandled_application_error",
                extra={"extra_fields": {"exception_type": type(exc).__name__}},
            )
            response = JSONResponse(
                status_code=500,
                content=error_payload(ErrorCode.INTERNAL_ERROR, "An unexpected service error occurred"),
            )
            await response(scope, receive, send_with_request_id)
        finally:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            try:
                logger.info(
                    "http_request_complete",
                    extra={
                        "extra_fields": {
                            "method": scope.get("method"),
                            "path": scope.get("path"),
                            "status_code": status_code,
                            "latency_ms": elapsed_ms,
                        }
                    },
                )
            finally:
                request_id_context.reset(token)
