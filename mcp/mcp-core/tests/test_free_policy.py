from __future__ import annotations

from datetime import date

from mcp_core.free_policy import classify_offer
from mcp_core.models import FreeStatus, Offer, Pricing
from mcp_core.registry import FreeProviderEntry, Promotion, Registry


def _registry() -> Registry:
    return Registry(
        free_providers={
            "groq": FreeProviderEntry(
                provider="groq",
                via="direct-provider",
                free_tier="known",
                notes="rate-limited free tier",
                verified_at=date.today().isoformat(),
            )
        },
        promotions=[
            Promotion(
                model_id="org/promo",
                provider="nebius",
                note="temporary promo",
                verified_at=date.today().isoformat(),
            )
        ],
    )


def test_verified_free_flag_wins() -> None:
    offer = Offer(provider="groq", is_free=True, pricing=Pricing(input_usd_per_mtok=1, output_usd_per_mtok=2))
    verdict = classify_offer(offer, _registry(), "org/model")
    assert verdict.status is FreeStatus.VERIFIED_FREE
    assert verdict.confidence == 1.0
    assert verdict.via == "hf-router"


def test_zero_price_is_free() -> None:
    offer = Offer(provider="unknown", pricing=Pricing(input_usd_per_mtok=0, output_usd_per_mtok=0))
    verdict = classify_offer(offer, _registry(), "org/model")
    assert verdict.status is FreeStatus.ZERO_PRICE


def test_paid_stays_paid_even_when_provider_has_free_tier() -> None:
    offer = Offer(provider="groq", pricing=Pricing(input_usd_per_mtok=0.1, output_usd_per_mtok=0.2))
    verdict = classify_offer(offer, _registry(), "org/model")
    assert verdict.status is FreeStatus.PAID
    assert any("free tier" in item for item in verdict.evidence)


def test_promo_classification() -> None:
    offer = Offer(provider="nebius", pricing=None)
    verdict = classify_offer(offer, _registry(), "org/promo")
    assert verdict.status is FreeStatus.FREE_PROMO
    assert verdict.confidence == 0.8


def test_known_free_tier_without_price() -> None:
    offer = Offer(provider="groq")
    verdict = classify_offer(offer, _registry(), "org/model")
    assert verdict.status is FreeStatus.FREE_TIER
    assert verdict.via == "direct-provider"


def test_missing_data_stays_unknown() -> None:
    offer = Offer(provider="mystery")
    verdict = classify_offer(offer, _registry(), "org/model")
    assert verdict.status is FreeStatus.UNKNOWN
    assert verdict.confidence == 0.0
