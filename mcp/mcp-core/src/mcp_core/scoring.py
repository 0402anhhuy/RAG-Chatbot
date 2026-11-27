"""Score model offers for the recommendation tool."""

from __future__ import annotations

import math

from mcp_core.models import ModelRecord, Offer


def score_offer(
    record: ModelRecord,
    offer: Offer,
    *,
    min_context: int | None = None,
    require_tools: bool = False,
    max_latency_ms: float | None = None,
) -> float:
    free_confidence = offer.free.confidence if offer.free else 0.0
    score = 0.35 * free_confidence

    if min_context is not None:
        if offer.context_length is None:
            score += 0.05
        elif offer.context_length >= min_context:
            score += 0.15
        else:
            score -= 0.5
    else:
        score += 0.15 * _log_fit(offer.context_length, cap=200_000)

    if require_tools:
        score += 0.10 if offer.supports_tools is True else -0.30
    else:
        score += 0.05 if offer.supports_tools is True else 0.0

    if max_latency_ms is not None:
        if offer.latency_ms is None:
            score += 0.0
        elif offer.latency_ms <= max_latency_ms:
            score += 0.10
        else:
            score -= 0.15
    else:
        score += 0.10 * _inverse_fit(offer.latency_ms, cap=5_000)

    score += 0.10 * _inverse_fit(offer.throughput_tps, cap=300)
    score += 0.10 * _log_fit(record.downloads, cap=10_000_000)

    if offer.pricing is not None and offer.pricing.has_positive_price():
        total = offer.pricing.total()
        if total is not None:
            score -= min(0.20, total / 100.0)

    return round(max(0.0, min(1.0, score)), 4)


def reason_for(record: ModelRecord, offer: Offer) -> str:
    parts: list[str] = []
    if offer.free is not None:
        parts.append(offer.free.status.value)
    if offer.supports_tools:
        parts.append("tool calling")
    if offer.context_length:
        parts.append(f"{offer.context_length // 1000}k context")
    if offer.latency_ms is not None:
        parts.append(f"{offer.latency_ms:.0f}ms TTFT")
    if offer.throughput_tps is not None:
        parts.append(f"{offer.throughput_tps:.0f} tok/s")
    return " + ".join(parts) if parts else "no verified signals"


def _log_fit(value: int | float | None, *, cap: int) -> float:
    if value is None or value <= 0:
        return 0.0
    return min(1.0, math.log1p(value) / math.log1p(cap))


def _inverse_fit(value: float | None, *, cap: float) -> float:
    if value is None or value <= 0:
        return 0.0
    return min(1.0, cap / (cap + value))
