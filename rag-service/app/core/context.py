"""Request-scoped context shared by middleware and error handling."""

from contextvars import ContextVar

request_id_context: ContextVar[str] = ContextVar("request_id", default="-")
