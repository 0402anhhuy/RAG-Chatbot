"""Provider-agnostic use cases behind the MCP tools."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from mcp_core.contracts import CatalogBackend
from mcp_core.models import (
    FREE_STATUSES,
    FreeStatus,
    ModelLimits,
    ModelRecord,
    Offer,
)
from mcp_core.registry import Registry
from mcp_core.scoring import reason_for, score_offer

MAX_RESULTS = 50
MAX_LIMIT_FETCHES = 10


class CatalogService:
    def __init__(self, backend: CatalogBackend, registry: Registry) -> None:
        self.backend = backend
        self.registry = registry

    async def search(
        self,
        *,
        query: str = "",
        task: str = "text-generation",
        provider: str | None = None,
        free_only: bool = True,
        include_unknown: bool = False,
        min_context: int | None = None,
        min_output_tokens: int | None = None,
        require_tools: bool = False,
        include_limits: bool = False,
        sort: str = "recommended",
        limit: int = 20,
    ) -> dict[str, Any]:
        safe_limit = max(1, min(int(limit), MAX_RESULTS))
        records = await self.backend.search_models(
            query=query,
            task=task,
            provider=provider,
            limit=max(safe_limit * 4, 40),
        )

        candidates: list[tuple[ModelRecord, Offer]] = []
        for record in records:
            annotated = self._annotate(record)
            offers = [offer for offer in annotated.offers if provider is None or offer.provider == provider]
            offers = [
                offer
                for offer in offers
                if self._offer_included(offer, free_only=free_only, include_unknown=include_unknown)
            ]
            if min_context is not None:
                offers = [
                    offer for offer in offers if offer.context_length is None or offer.context_length >= min_context
                ]
            if require_tools:
                offers = [offer for offer in offers if offer.supports_tools is True]
            if not offers:
                continue
            best = max(
                offers,
                key=lambda offer: score_offer(
                    annotated,
                    offer,
                    min_context=min_context,
                    require_tools=require_tools,
                ),
            )
            candidates.append((annotated, best))

        candidates.sort(key=lambda pair: self._sort_key(pair[0], pair[1], sort))

        need_limits = include_limits or min_output_tokens is not None
        limit_map: dict[str, ModelLimits] = {}
        if need_limits and candidates:
            fetch_count = min(len(candidates), MAX_LIMIT_FETCHES if min_output_tokens is not None else safe_limit)
            limit_map = await self._fetch_limits(candidates[:fetch_count])

        items: list[dict[str, Any]] = []
        for record, offer in candidates:
            limits = limit_map.get(record.model_id)
            if min_output_tokens is not None and limits is not None:
                max_output = limits.max_output_tokens
                if max_output is not None and max_output < min_output_tokens:
                    continue
            item = self._item_payload(record, offer, limits=limits if include_limits else None)
            if min_output_tokens is not None:
                item["output_limit_unverified"] = limits is None or limits.max_output_tokens is None
            items.append(item)
            if len(items) >= safe_limit:
                break

        warnings: list[str] = []
        if not items:
            warnings.append(
                "No models matched. Free status is dynamic and may currently be unavailable; "
                "try free_only=false or include_unknown=true."
            )
        if any(item.get("output_limit_unverified") for item in items):
            warnings.append("Some max_output_tokens values are not published; they were not verified.")

        return {
            "generated_at": _utcnow(),
            "source": self.backend.name,
            "query": query,
            "task": task,
            "free_only": free_only,
            "count": len(items),
            "models": items,
            "warnings": warnings,
        }

    async def get_model_offers(self, model_id: str, provider: str | None = None) -> dict[str, Any]:
        record = self._annotate(await self.backend.get_model(model_id))
        offers = [offer for offer in record.offers if provider is None or offer.provider == provider]
        offers.sort(key=lambda offer: (-(offer.free.confidence if offer.free else 0.0), offer.provider))
        return {
            "model_id": record.model_id,
            "task": record.task,
            "downloads": record.downloads,
            "likes": record.likes,
            "count": len(offers),
            "offers": [offer.model_dump(mode="json", exclude_none=True) for offer in offers],
        }

    async def check_free(self, model_id: str, provider: str | None = None) -> dict[str, Any]:
        record = self._annotate(await self.backend.get_model(model_id))
        offer = self._select_offer(record, provider)
        if offer is None:
            evidence = (
                [f"provider '{provider}' does not serve this model"] if provider else ["no provider offers found"]
            )
            return {
                "model_id": record.model_id,
                "provider": provider,
                "verdict": FreeStatus.UNKNOWN.value,
                "confidence": 0.0,
                "evidence": evidence,
                "checked_at": _utcnow(),
            }
        assert offer.free is not None
        return {
            "model_id": record.model_id,
            "provider": offer.provider,
            "verdict": offer.free.status.value,
            "confidence": offer.free.confidence,
            "evidence": offer.free.evidence,
            "via": offer.free.via,
            "checked_at": _utcnow(),
        }

    async def get_model_limits(self, model_id: str, provider: str | None = None) -> dict[str, Any]:
        limits = await self.backend.get_model_limits(model_id, provider)
        return limits.model_dump(mode="json")

    async def get_quota(
        self,
        *,
        model_id: str | None = None,
        provider: str | None = None,
        include_account: bool = True,
        include_zero_gpu: bool = True,
        include_hub_rate_limit: bool = True,
        include_provider_limits: bool = True,
        organization: str | None = None,
    ) -> dict[str, Any]:
        snapshot = await self.backend.get_quota(
            model_id=model_id,
            provider=provider,
            include_account=include_account,
            include_zero_gpu=include_zero_gpu,
            include_hub_rate_limit=include_hub_rate_limit,
            include_provider_limits=include_provider_limits,
            organization=organization,
        )
        return snapshot.model_dump(mode="json", exclude_none=True)

    async def list_providers(self, *, only_free: bool = False, task: str | None = None) -> dict[str, Any]:
        providers = await self.backend.list_providers(task=task)
        if only_free:
            providers = [
                provider
                for provider in providers
                if provider.free_models_seen > 0 or (provider.free_tier or "") in {"known", "trial"}
            ]
        providers.sort(key=lambda provider: (-provider.free_models_seen, -provider.models_seen, provider.provider))
        return {
            "generated_at": _utcnow(),
            "source": self.backend.name,
            "count": len(providers),
            "providers": [provider.model_dump(mode="json", exclude_none=True) for provider in providers],
        }

    async def recommend(
        self,
        *,
        use_case: str,
        task: str = "text-generation",
        require_tools: bool = False,
        min_context: int | None = None,
        language: str | None = None,
        max_latency_ms: float | None = None,
        allow_paid_fallback: bool = True,
    ) -> dict[str, Any]:
        free_result = await self.search(
            query="",
            task=task,
            free_only=True,
            include_unknown=False,
            min_context=min_context,
            require_tools=require_tools,
            include_limits=True,
            sort="recommended",
            limit=10,
        )
        recommendations = free_result["models"][:3]
        fallback: list[dict[str, Any]] = []
        if not recommendations and allow_paid_fallback:
            paid_result = await self.search(
                query="",
                task=task,
                free_only=False,
                include_unknown=False,
                min_context=min_context,
                require_tools=require_tools,
                include_limits=True,
                sort="cheapest",
                limit=5,
            )
            fallback = paid_result["models"][:3]

        warnings = list(free_result["warnings"])
        if language:
            warnings.append(f"Language preference '{language}' is not verified from provider metadata.")
        if max_latency_ms:
            filtered: list[dict[str, Any]] = []
            for item in recommendations:
                latency = item.get("latency_ms")
                if latency is None:
                    item["latency_unverified"] = True
                    filtered.append(item)
                elif latency <= max_latency_ms:
                    filtered.append(item)
            recommendations = filtered
        if not recommendations:
            warnings.append("No verified free model matched; paid fallback is shown only as a last resort.")

        return {
            "generated_at": _utcnow(),
            "use_case": use_case,
            "task": task,
            "recommendations": recommendations,
            "fallback_paid": fallback,
            "warnings": warnings,
        }

    async def build_provider_config(
        self,
        *,
        model_id: str,
        provider: str | None = None,
        target: str = "openai-sdk",
    ) -> dict[str, Any]:
        config = await self.backend.build_provider_config(model_id, provider, target)
        limits: dict[str, Any] | None = None
        try:
            limits = (await self.backend.get_model_limits(model_id, provider)).model_dump(mode="json")
        except Exception:
            limits = None
        config["limits"] = limits
        config["quota_note"] = (
            "Provider quota is dynamic. Call get_quota before production use; "
            "remaining personal HF credits are not exposed by a public API."
        )
        return config

    def _annotate(self, record: ModelRecord) -> ModelRecord:
        from mcp_core.free_policy import classify_offer

        for offer in record.offers:
            offer.free = classify_offer(offer, self.registry, record.model_id)
        return record

    @staticmethod
    def _offer_included(offer: Offer, *, free_only: bool, include_unknown: bool) -> bool:
        if offer.free is None:
            return include_unknown
        if free_only:
            if offer.free.status in FREE_STATUSES:
                return True
            return include_unknown and offer.free.status is FreeStatus.UNKNOWN
        if offer.free.status is FreeStatus.UNKNOWN:
            return include_unknown
        return True

    @staticmethod
    def _select_offer(record: ModelRecord, provider: str | None) -> Offer | None:
        offers = [offer for offer in record.offers if provider is None or offer.provider == provider]
        if not offers:
            return None
        return max(
            offers,
            key=lambda offer: (
                offer.free.confidence if offer.free else 0.0,
                bool(offer.supports_tools),
                offer.context_length or 0,
            ),
        )

    @staticmethod
    def _sort_key(record: ModelRecord, offer: Offer, sort: str) -> tuple[float, ...]:
        score = score_offer(record, offer)
        if sort == "downloads":
            return (-float(record.downloads or 0), -score)
        if sort == "cheapest":
            total = offer.pricing.total() if offer.pricing else None
            return (float(total) if total is not None else float("inf"), -score)
        if sort == "fastest":
            return (offer.latency_ms if offer.latency_ms is not None else float("inf"), -score)
        return (-score, -(record.downloads or 0))

    async def _fetch_limits(self, pairs: list[tuple[ModelRecord, Offer]]) -> dict[str, ModelLimits]:
        semaphore = asyncio.Semaphore(4)
        results: dict[str, ModelLimits] = {}

        async def fetch(record: ModelRecord, offer: Offer) -> None:
            async with semaphore:
                try:
                    limits = await self.backend.get_model_limits(record.model_id, offer.provider)
                except Exception:
                    return
                results[record.model_id] = limits

        await asyncio.gather(*(fetch(record, offer) for record, offer in pairs))
        return results

    @staticmethod
    def _item_payload(
        record: ModelRecord,
        offer: Offer,
        *,
        limits: ModelLimits | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model_id": record.model_id,
            "call_model_id": offer.call_model_id or f"{record.model_id}:{offer.provider}",
            "provider": offer.provider,
            "provider_name": offer.provider_name,
            "free_status": offer.free.status.value if offer.free else FreeStatus.UNKNOWN.value,
            "free_confidence": offer.free.confidence if offer.free else 0.0,
            "free_evidence": offer.free.evidence if offer.free else [],
            "via": offer.free.via if offer.free else "unknown",
            "pricing_usd_per_mtok": (
                {
                    "input": offer.pricing.input_usd_per_mtok,
                    "output": offer.pricing.output_usd_per_mtok,
                }
                if offer.pricing
                else None
            ),
            "context_length": offer.context_length,
            "supports_tools": offer.supports_tools,
            "supports_structured_output": offer.supports_structured_output,
            "latency_ms": offer.latency_ms,
            "throughput_tps": offer.throughput_tps,
            "uptime_percent": offer.uptime_percent,
            "quantization": offer.quantization,
            "downloads": record.downloads,
            "likes": record.likes,
            "score": score_offer(record, offer),
            "reason": reason_for(record, offer),
            "other_providers": sorted({o.provider for o in record.offers if o.provider != offer.provider}),
        }
        if limits is not None:
            payload["limits"] = limits.model_dump(mode="json")
        return {key: value for key, value in payload.items() if value is not None}


def _utcnow() -> str:
    return datetime.now(UTC).isoformat()
