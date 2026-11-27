"""Application exceptions and the public error response contract."""

from __future__ import annotations

import logging
from enum import StrEnum
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.context import request_id_context

logger = logging.getLogger(__name__)


class ErrorCode(StrEnum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTH_ERROR = "AUTH_ERROR"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    RATE_LIMITED = "RATE_LIMITED"
    RATE_LIMIT_BACKEND_ERROR = "RATE_LIMIT_BACKEND_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class ApiError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        *,
        status_code: int,
        details: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.headers = headers or {}


def error_payload(
    code: ErrorCode,
    message: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": code.value,
            "message": message,
            "details": details or {},
            "request_id": request_id_context.get(),
        },
    }


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
        logger.log(
            logging.ERROR if exc.status_code >= 500 else logging.INFO,
            "request_rejected",
            extra={"extra_fields": {"error_code": exc.code.value, "status_code": exc.status_code}},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(exc.code, exc.message, exc.details),
            headers=exc.headers or None,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        safe_errors = [
            {
                "loc": [str(part) for part in error.get("loc", ())],
                "type": str(error.get("type", "validation_error")),
                "msg": str(error.get("msg", "Invalid input")),
            }
            for error in exc.errors()[:10]
        ]
        return JSONResponse(
            status_code=422,
            content=error_payload(ErrorCode.VALIDATION_ERROR, "Request validation failed", {"errors": safe_errors}),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        if exc.status_code == 401:
            code = ErrorCode.AUTH_ERROR
        elif exc.status_code == 403:
            code = ErrorCode.FORBIDDEN
        elif exc.status_code == 404:
            code = ErrorCode.NOT_FOUND
        else:
            code = ErrorCode.INTERNAL_ERROR if exc.status_code >= 500 else ErrorCode.VALIDATION_ERROR
        message = {
            401: "Authentication required",
            403: "Forbidden",
            404: "Not found",
        }.get(exc.status_code, "Request failed")
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(code, message),
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "unhandled_application_error",
            extra={"extra_fields": {"exception_type": type(exc).__name__}},
        )
        return JSONResponse(
            status_code=500,
            content=error_payload(ErrorCode.INTERNAL_ERROR, "An unexpected service error occurred"),
        )
