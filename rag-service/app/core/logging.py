"""Structured logging with request correlation and conservative secret redaction."""

from __future__ import annotations

import json
import logging
import re
import sys
from datetime import UTC, datetime
from typing import Any, TextIO

from app.core.context import request_id_context

SENSITIVE_KEYS = {"api_key", "apikey", "authorization", "password", "secret", "token"}
SECRET_PATTERN = re.compile(r"(?i)(?:bearer\s+|sk-|gsk_|AIza|gh[pousr]_)[A-Za-z0-9._-]{8,}")


def _safe_value(key: str, value: Any) -> Any:
    if key.lower() in SENSITIVE_KEYS:
        return "[REDACTED]"
    if isinstance(value, dict):
        return {str(child_key): _safe_value(str(child_key), child_value) for child_key, child_value in value.items()}
    if isinstance(value, (list, tuple)):
        return [_safe_value(key, item) for item in value]
    if isinstance(value, str):
        return SECRET_PATTERN.sub("[REDACTED]", value)
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "event": _safe_value("message", record.getMessage()),
            "request_id": request_id_context.get(),
        }
        extra_fields = getattr(record, "extra_fields", None)
        if isinstance(extra_fields, dict):
            payload.update(_safe_value("", extra_fields))
        return json.dumps(payload, ensure_ascii=True, separators=(",", ":"))


class TextFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        message = SECRET_PATTERN.sub("[REDACTED]", record.getMessage())
        return f"{record.levelname} [{request_id_context.get()}] {record.name}: {message}"


class ServiceStreamHandler(logging.StreamHandler[TextIO]):
    _rag_service_handler = True


def setup_logging(level: str = "INFO", log_format: str = "json") -> None:
    handler = ServiceStreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if log_format == "json" else TextFormatter())
    root = logging.getLogger()
    root.handlers[:] = [existing for existing in root.handlers if not getattr(existing, "_rag_service_handler", False)]
    root.addHandler(handler)
    root.setLevel(level.upper())
    for logger_name in ("httpx", "httpcore", "redis"):
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
