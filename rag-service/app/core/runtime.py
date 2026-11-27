"""Bounded worker pool for blocking RAG work with a request deadline."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import TypeVar

from app.core.errors import ApiError, ErrorCode

T = TypeVar("T")


class WorkGate:
    """Cap concurrent thread work and enforce a wall-clock deadline.

    A timed-out thread cannot be killed, so it keeps its semaphore slot until the
    thread actually returns; otherwise repeated timeouts would silently exceed the
    configured concurrency limit.
    """

    def __init__(self, limit: int) -> None:
        if limit <= 0:
            raise ValueError("limit must be positive")
        self._semaphore = asyncio.Semaphore(limit)

    async def run(
        self,
        func: Callable[..., T],
        *args: object,
        timeout: float | None = None,
        **kwargs: object,
    ) -> T:
        await self._semaphore.acquire()

        async def execute() -> T:
            try:
                return await asyncio.to_thread(func, *args, **kwargs)
            finally:
                self._semaphore.release()

        task = asyncio.create_task(execute())
        if timeout is None:
            return await task
        try:
            return await asyncio.wait_for(asyncio.shield(task), timeout=timeout)
        except TimeoutError as exc:
            raise ApiError(
                ErrorCode.INTERNAL_ERROR,
                "RAG request timed out",
                status_code=504,
            ) from exc


__all__ = ["WorkGate"]
