from __future__ import annotations

import time

import pytest

from app.core.errors import ApiError
from app.core.runtime import WorkGate


@pytest.mark.asyncio
async def test_gate_returns_thread_result() -> None:
    gate = WorkGate(2)

    assert await gate.run(lambda value: value * 2, 21, timeout=1) == 42


@pytest.mark.asyncio
async def test_gate_raises_504_on_deadline() -> None:
    gate = WorkGate(1)

    with pytest.raises(ApiError) as raised:
        await gate.run(time.sleep, 0.2, timeout=0.01)
    assert raised.value.status_code == 504


@pytest.mark.asyncio
async def test_gate_releases_slot_after_timeout() -> None:
    gate = WorkGate(1)

    with pytest.raises(ApiError):
        await gate.run(time.sleep, 0.05, timeout=0.001)

    started = time.perf_counter()
    assert await gate.run(lambda: "ok", timeout=2) == "ok"
    assert time.perf_counter() - started < 1


def test_gate_rejects_invalid_limit() -> None:
    with pytest.raises(ValueError):
        WorkGate(0)
