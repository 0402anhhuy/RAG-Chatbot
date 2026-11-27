"""Shared data contracts for model-catalog MCP servers."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


class FreeStatus(StrEnum):
    VERIFIED_FREE = "verified_free"
    ZERO_PRICE = "zero_price"
    FREE_PROMO = "free_promo"
    FREE_TIER = "free_tier"
    PAID = "paid"
    UNKNOWN = "unknown"


FREE_STATUSES = frozenset(
    {
        FreeStatus.VERIFIED_FREE,
        FreeStatus.ZERO_PRICE,
        FreeStatus.FREE_PROMO,
        FreeStatus.FREE_TIER,
    }
)


class FreeVerdict(BaseModel):
    status: FreeStatus
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = Field(default_factory=list)
    via: Literal["hf-router", "direct-provider", "unknown"] = "unknown"
    checked_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Pricing(BaseModel):
    input_usd_per_mtok: float | None = None
    output_usd_per_mtok: float | None = None

    def is_zero(self) -> bool:
        return self.input_usd_per_mtok == 0 and self.output_usd_per_mtok == 0

    def has_positive_price(self) -> bool:
        return bool(
            (self.input_usd_per_mtok is not None and self.input_usd_per_mtok > 0)
            or (self.output_usd_per_mtok is not None and self.output_usd_per_mtok > 0)
        )

    def total(self) -> float | None:
        values = [v for v in (self.input_usd_per_mtok, self.output_usd_per_mtok) if v is not None]
        return sum(values) if values else None


class Offer(BaseModel):
    provider: str
    provider_name: str | None = None
    status: str | None = None
    context_length: int | None = None
    pricing: Pricing | None = None
    is_free: bool | None = None
    supports_tools: bool | None = None
    supports_structured_output: bool | None = None
    latency_ms: float | None = None
    throughput_tps: float | None = None
    uptime_percent: float | None = None
    quantization: str | None = None
    call_model_id: str | None = None
    free: FreeVerdict | None = None


class ModelRecord(BaseModel):
    model_id: str
    task: str | None = None
    downloads: int | None = None
    likes: int | None = None
    created_at: str | None = None
    tags: list[str] = Field(default_factory=list)
    offers: list[Offer] = Field(default_factory=list)


class TokenLimit(BaseModel):
    value: int | None = None
    source: str = "unavailable"
    confidence: Literal["high", "medium", "low"] = "low"


class ModelLimits(BaseModel):
    model_id: str
    provider: str | None = None
    context_window: int | None = None
    context_window_source: str = "unavailable"
    model_max_context: int | None = None
    model_max_context_source: str | None = None
    max_output_tokens: int | None = None
    max_output_tokens_source: str = "not_published"
    sliding_window: int | None = None
    confidence: Literal["high", "medium", "low"] = "low"
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    warnings: list[str] = Field(default_factory=list)


class AccountQuota(BaseModel):
    source: str = "unavailable"
    plan: Literal["free", "pro", "team_or_enterprise", "anonymous", "unknown"] = "unknown"
    monthly_included_credits_usd: float | None = None
    billing_mode: str | None = None
    period_end: datetime | None = None
    can_pay: bool | None = None
    orgs: list[str] = Field(default_factory=list)
    remaining_credits: Literal["unknown"] = "unknown"
    usage_api: str = "unavailable_for_personal_account"


class ZeroGpuQuota(BaseModel):
    tier: str
    daily_quota_minutes: int | None = None
    remaining_minutes: Literal["unknown"] = "unknown"
    xlarge_multiplier: int = 2


class HubRateLimit(BaseModel):
    limit: int | None = None
    remaining: int | None = None
    window_seconds: int | None = None
    reset_after_seconds: int | None = None
    scope: str = "this MCP process"


class ProviderLimitInfo(BaseModel):
    provider: str
    via: str = "direct-provider"
    scope: str | None = None
    free_tier: dict[str, float | int | None] | None = None
    per_model: dict[str, dict[str, float | int | None]] = Field(default_factory=dict)
    notes: str | None = None
    source_url: str | None = None
    verified_at: str | None = None
    stale: bool = False


class RouterQuotaInfo(BaseModel):
    rate_limit: str = "not_documented"
    limit_basis: str = "monthly_credits"
    note: str = (
        "Hugging Face does not publish per-minute inference limits; "
        "monthly included credits and pay-as-you-go are the limit."
    )


class QuotaSnapshot(BaseModel):
    account: AccountQuota | None = None
    zero_gpu: ZeroGpuQuota | None = None
    hub_api: HubRateLimit | None = None
    provider_free_tier: ProviderLimitInfo | None = None
    via_hf_router: RouterQuotaInfo | None = None
    organization_usage: dict[str, Any] | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    warnings: list[str] = Field(default_factory=list)


class ProviderSummary(BaseModel):
    provider: str
    provider_name: str | None = None
    via: str = "hf-router"
    free_tier: str | None = None
    free_notes: str | None = None
    source_url: str | None = None
    verified_at: str | None = None
    models_seen: int = 0
    free_models_seen: int = 0
    cheapest_input_usd_per_mtok: float | None = None
    cheapest_output_usd_per_mtok: float | None = None


class CatalogBackendError(Exception):
    """Base error for catalog backends."""


class ModelNotFoundError(CatalogBackendError):
    def __init__(self, model_id: str) -> None:
        super().__init__(f"model not found: {model_id}")
        self.model_id = model_id
