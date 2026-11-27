"""YAML-backed free-tier and provider-limit registry."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

from mcp_core.models import ProviderLimitInfo

STALE_AFTER_DAYS = 30


class FreeProviderEntry(BaseModel):
    provider: str
    via: str = "direct-provider"
    free_tier: str = "unknown"
    notes: str | None = None
    source_url: str | None = None
    verified_at: str | None = None


class Promotion(BaseModel):
    model_id: str | None = None
    provider: str | None = None
    note: str | None = None
    verified_at: str | None = None


class Registry(BaseModel):
    free_providers: dict[str, FreeProviderEntry] = Field(default_factory=dict)
    promotions: list[Promotion] = Field(default_factory=list)
    provider_limits: dict[str, ProviderLimitInfo] = Field(default_factory=dict)
    updated_at: date | None = None

    def free_provider(self, provider: str) -> FreeProviderEntry | None:
        return self.free_providers.get(provider.lower())

    def provider_limit(self, provider: str) -> ProviderLimitInfo | None:
        entry = self.provider_limits.get(provider.lower())
        if entry is None:
            return None
        return entry.model_copy(update={"stale": _is_stale(entry.verified_at)})

    def find_promotion(self, model_id: str, provider: str | None) -> Promotion | None:
        model_lower = model_id.lower()
        provider_lower = provider.lower() if provider else None
        for promotion in self.promotions:
            if promotion.model_id and promotion.model_id.lower() != model_lower:
                continue
            if promotion.provider and provider_lower and promotion.provider.lower() != provider_lower:
                continue
            if promotion.provider and provider_lower is None:
                continue
            if _is_stale(promotion.verified_at):
                continue
            return promotion
        return None


def load_registry(
    free_tiers_path: str | Path | None = None,
    provider_limits_path: str | Path | None = None,
) -> Registry:
    free_data = _read_yaml(free_tiers_path)
    limits_data = _read_yaml(provider_limits_path)

    providers: dict[str, FreeProviderEntry] = {}
    for name, raw in (free_data.get("providers") or {}).items():
        if not isinstance(raw, dict):
            continue
        providers[str(name).lower()] = FreeProviderEntry(provider=str(name).lower(), **raw)

    promotions = [Promotion(**item) for item in (free_data.get("promotions") or []) if isinstance(item, dict)]

    limits: dict[str, ProviderLimitInfo] = {}
    for name, raw in (limits_data.get("providers") or {}).items():
        if not isinstance(raw, dict):
            continue
        limits[str(name).lower()] = ProviderLimitInfo(provider=str(name).lower(), **raw)

    return Registry(
        free_providers=providers,
        promotions=promotions,
        provider_limits=limits,
        updated_at=_parse_date(free_data.get("updated_at") or limits_data.get("updated_at")),
    )


def _read_yaml(path: str | Path | None) -> dict[str, Any]:
    if path is None:
        return {}
    file_path = Path(path)
    if not file_path.exists():
        return {}
    loaded = yaml.safe_load(file_path.read_text(encoding="utf-8"))
    return loaded if isinstance(loaded, dict) else {}


def _parse_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _is_stale(value: str | None) -> bool:
    parsed = _parse_date(value)
    if parsed is None:
        return True
    today = datetime.now(UTC).date()
    return parsed < today - timedelta(days=STALE_AFTER_DAYS)
