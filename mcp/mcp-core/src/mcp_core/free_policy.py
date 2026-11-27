"""Generic free-tier classification for provider offers."""

from __future__ import annotations

from typing import Literal, cast

from mcp_core.models import FreeStatus, FreeVerdict, Offer
from mcp_core.registry import Registry


def classify_offer(offer: Offer, registry: Registry, model_id: str | None = None) -> FreeVerdict:
    evidence: list[str] = []

    if offer.is_free is True:
        return FreeVerdict(
            status=FreeStatus.VERIFIED_FREE,
            confidence=1.0,
            evidence=["router.is_free=true"],
            via="hf-router",
        )

    pricing = offer.pricing
    if pricing is not None and pricing.is_zero():
        return FreeVerdict(
            status=FreeStatus.ZERO_PRICE,
            confidence=1.0,
            evidence=["router.pricing.input=0 and router.pricing.output=0"],
            via="hf-router",
        )

    promotion = registry.find_promotion(model_id, offer.provider) if model_id else None
    if promotion is not None:
        evidence.append("registry.promotion matched")
        if promotion.note:
            evidence.append(promotion.note)
        return FreeVerdict(
            status=FreeStatus.FREE_PROMO,
            confidence=0.8,
            evidence=evidence,
            via="hf-router",
        )

    entry = registry.free_provider(offer.provider)
    if pricing is not None and pricing.has_positive_price():
        evidence.append("router.pricing has a positive input/output rate")
        if entry is not None and entry.free_tier in {"known", "trial"}:
            evidence.append(f"direct provider may have a free tier: {entry.free_tier}")
        return FreeVerdict(
            status=FreeStatus.PAID,
            confidence=0.9,
            evidence=evidence,
            via="hf-router",
        )

    if entry is not None and entry.free_tier in {"known", "trial"}:
        evidence.append(f"registry.free_tier={entry.free_tier}")
        if entry.notes:
            evidence.append(entry.notes)
        confidence = 0.55 if entry.free_tier == "known" else 0.4
        via = entry.via if entry.via in {"hf-router", "direct-provider"} else "direct-provider"
        return FreeVerdict(
            status=FreeStatus.FREE_TIER,
            confidence=confidence,
            evidence=evidence,
            via=cast(Literal["hf-router", "direct-provider", "unknown"], via),
        )

    return FreeVerdict(
        status=FreeStatus.UNKNOWN,
        confidence=0.0,
        evidence=["no free flag, zero price, promotion, or known free tier"],
        via="unknown",
    )
