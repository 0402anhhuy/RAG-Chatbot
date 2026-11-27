"""Hugging Face implementation of the shared CatalogBackend contract."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from mcp_core.contracts import CatalogBackend
from mcp_core.free_policy import classify_offer
from mcp_core.models import (
    AccountQuota,
    FreeStatus,
    HubRateLimit,
    ModelLimits,
    ModelNotFoundError,
    ModelRecord,
    Offer,
    Pricing,
    ProviderSummary,
    QuotaSnapshot,
    RouterQuotaInfo,
    ZeroGpuQuota,
)
from mcp_core.registry import Registry

from mcp_hf.client import HuggingFaceAPI, HuggingFaceAPIError
from mcp_hf.settings import Settings

_CONTEXT_KEYS = {"max_position_embeddings", "n_positions", "max_seq_len", "seq_length"}
_OUTPUT_KEYS = {"max_new_tokens", "max_output_tokens"}
_SLIDING_KEYS = {"sliding_window"}
_HUGE_TOKENIZER_LENGTH = 10_000_000


class HuggingFaceBackend(CatalogBackend):
    name = "hf-router"

    def __init__(self, settings: Settings, registry: Registry, *, api: HuggingFaceAPI | None = None) -> None:
        self.settings = settings
        self.registry = registry
        self.api = api or HuggingFaceAPI(settings)

    async def search_models(
        self,
        *,
        query: str,
        task: str,
        provider: str | None,
        limit: int,
    ) -> list[ModelRecord]:
        router_models = await self.api.router_models()
        hub_meta = await self._hub_metadata(query=query, task=task)

        records: list[ModelRecord] = []
        query_lower = query.lower().strip()
        for raw in router_models:
            model_id = str(raw.get("id") or "")
            if not model_id:
                continue
            if query_lower and query_lower not in model_id.lower():
                continue
            if not _matches_task(raw, task):
                continue
            offers = _offers_from_router(model_id, raw)
            if provider:
                offers = [offer for offer in offers if offer.provider == provider.lower()]
            if not offers:
                continue
            meta = hub_meta.get(model_id, {})
            records.append(
                ModelRecord(
                    model_id=model_id,
                    task=task,
                    downloads=_as_int(meta.get("downloads")),
                    likes=_as_int(meta.get("likes")),
                    created_at=meta.get("createdAt"),
                    tags=[str(tag) for tag in (meta.get("tags") or [])],
                    offers=offers,
                )
            )
            if len(records) >= max(1, min(limit, 100)):
                break
        return records

    async def get_model(self, model_id: str) -> ModelRecord:
        router_models = await self.api.router_models()
        raw = _find_router_model(router_models, model_id)
        if raw is not None:
            info = await self._safe_model_info(model_id)
            return ModelRecord(
                model_id=str(raw.get("id") or model_id),
                task=_task_from_router(raw),
                downloads=_as_int(info.get("downloads")),
                likes=_as_int(info.get("likes")),
                created_at=info.get("createdAt"),
                tags=[str(tag) for tag in (info.get("tags") or [])],
                offers=_offers_from_router(str(raw.get("id") or model_id), raw),
            )

        info = await self._safe_model_info(model_id)
        if not info:
            raise ModelNotFoundError(model_id)
        return ModelRecord(
            model_id=str(info.get("id") or model_id),
            task=info.get("pipeline_tag"),
            downloads=_as_int(info.get("downloads")),
            likes=_as_int(info.get("likes")),
            created_at=info.get("createdAt"),
            tags=[str(tag) for tag in (info.get("tags") or [])],
            offers=[],
        )

    async def get_model_limits(self, model_id: str, provider: str | None = None) -> ModelLimits:
        record = await self.get_model(model_id)
        offer = _select_offer(record, provider)

        config, tokenizer, generation, info = await asyncio.gather(
            self.api.raw_json(record.model_id, "config.json"),
            self.api.raw_json(record.model_id, "tokenizer_config.json"),
            self.api.raw_json(record.model_id, "generation_config.json"),
            self._safe_model_info(record.model_id, full=True),
            return_exceptions=True,
        )
        config = config if isinstance(config, dict) else None
        tokenizer = tokenizer if isinstance(tokenizer, dict) else None
        generation = generation if isinstance(generation, dict) else None
        info = info if isinstance(info, dict) else {}

        config_context = _max_value(_collect_numbers(config, _CONTEXT_KEYS)) if config else None
        tokenizer_context = _max_value(_collect_numbers(tokenizer, {"model_max_length"}))
        if tokenizer_context is not None and tokenizer_context > _HUGE_TOKENIZER_LENGTH:
            tokenizer_context = None
        model_max_context = _max_value([value for value in (config_context, tokenizer_context) if value is not None])

        output_values = _collect_numbers(generation, _OUTPUT_KEYS) if generation else []
        output_values += _collect_numbers(info.get("cardData"), _OUTPUT_KEYS)
        max_output = min(output_values) if output_values else None

        sliding = _max_value(_collect_numbers(config, _SLIDING_KEYS)) if config else None

        warnings: list[str] = []
        context_window: int | None = None
        context_source = "unavailable"
        if offer is not None and offer.context_length is not None:
            context_window = offer.context_length
            context_source = f"router.providers[{offer.provider}].context_length"
        elif model_max_context is not None:
            context_window = model_max_context
            context_source = "model_config_or_tokenizer"

        if config is None:
            warnings.append("Model config is not public (gated or 401); context may come from the router only.")
        if context_window is not None and model_max_context is not None and context_window < model_max_context:
            warnings.append(
                f"Provider context ({context_window}) is lower than the model maximum ({model_max_context})."
            )
        if max_output is None:
            warnings.append("max_output_tokens is not published by the model; returned as null, not inferred.")
        else:
            warnings.append(
                "max_output_tokens comes from generation_config or the model card; "
                "a provider may enforce a different output cap."
            )

        if context_source.startswith("router."):
            confidence = "high"
        elif context_window is not None:
            confidence = "medium"
        else:
            confidence = "low"

        return ModelLimits(
            model_id=record.model_id,
            provider=offer.provider if offer else provider,
            context_window=context_window,
            context_window_source=context_source,
            model_max_context=model_max_context,
            model_max_context_source=_source_for_context(config_context, tokenizer_context),
            max_output_tokens=max_output,
            max_output_tokens_source=(
                "generation_config.max_new_tokens_or_model_card" if max_output is not None else "not_published"
            ),
            sliding_window=sliding,
            confidence=confidence,
            warnings=warnings,
        )

    async def get_quota(
        self,
        *,
        model_id: str | None,
        provider: str | None,
        include_account: bool,
        include_zero_gpu: bool,
        include_hub_rate_limit: bool,
        include_provider_limits: bool,
        organization: str | None,
    ) -> QuotaSnapshot:
        warnings: list[str] = []
        chosen_provider = provider
        if chosen_provider is None and model_id:
            try:
                record = await self.get_model(model_id)
                offer = _select_offer(record, None)
                chosen_provider = offer.provider if offer else None
            except HuggingFaceAPIError:
                warnings.append("Could not resolve the model provider; provider limits are not selected.")

        account = await self._account_quota(include_account=include_account, warnings=warnings)
        zero_gpu = _zero_gpu_quota(account.plan if account else "anonymous") if include_zero_gpu else None

        hub_rate_limit: HubRateLimit | None = None
        if include_hub_rate_limit:
            if self.api.last_hub_rate_limit is None:
                try:
                    await self.api.hub_search(query="", limit=1)
                except HuggingFaceAPIError as exc:
                    warnings.append(f"Could not read Hub rate-limit headers: {exc}")
            hub_rate_limit = self.api.last_hub_rate_limit

        provider_limits = None
        if include_provider_limits:
            limit_provider = chosen_provider or "huggingface"
            provider_limits = self.registry.provider_limit(limit_provider)
            if provider_limits is None:
                warnings.append(f"No provider-limit registry entry for '{limit_provider}'.")
            elif provider_limits.stale:
                warnings.append(f"Provider limits for '{limit_provider}' are older than 30 days; verify at the source.")

        organization_usage = None
        if organization:
            if not self.api.token:
                warnings.append("organization usage requires HF_TOKEN.")
            else:
                try:
                    organization_usage = await self.api.organization_usage(organization)
                except HuggingFaceAPIError as exc:
                    warnings.append(f"Organization usage is Enterprise-only or unavailable ({exc.status_code}).")

        if not self.api.token:
            warnings.append("Set HF_TOKEN to read account plan; remaining personal credits have no public API.")
        else:
            warnings.append("Remaining personal credits are not exposed by a public API; check the billing page.")
        if zero_gpu is not None and zero_gpu.daily_quota_minutes is None:
            warnings.append("ZeroGPU daily quota for this account tier is not a single published value.")
        warnings.append("Provider free-tier limits apply only when calling the provider directly, not via HF router.")

        return QuotaSnapshot(
            account=account,
            zero_gpu=zero_gpu,
            hub_api=hub_rate_limit,
            provider_free_tier=provider_limits,
            via_hf_router=RouterQuotaInfo(),
            organization_usage=organization_usage,
            warnings=warnings,
        )

    async def list_providers(self, *, task: str | None = None) -> list[ProviderSummary]:
        router_models = await self.api.router_models()
        summaries: dict[str, ProviderSummary] = {}

        for raw in router_models:
            if task and not _matches_task(raw, task):
                continue
            for offer in _offers_from_router(str(raw.get("id") or ""), raw):
                free = classify_offer(offer, self.registry, str(raw.get("id") or ""))
                summary = summaries.setdefault(
                    offer.provider,
                    ProviderSummary(provider=offer.provider, provider_name=offer.provider_name),
                )
                summary.models_seen += 1
                if free.status in {
                    FreeStatus.VERIFIED_FREE,
                    FreeStatus.ZERO_PRICE,
                    FreeStatus.FREE_PROMO,
                    FreeStatus.FREE_TIER,
                }:
                    summary.free_models_seen += 1
                if offer.pricing is not None:
                    summary.cheapest_input_usd_per_mtok = _min_optional(
                        summary.cheapest_input_usd_per_mtok, offer.pricing.input_usd_per_mtok
                    )
                    summary.cheapest_output_usd_per_mtok = _min_optional(
                        summary.cheapest_output_usd_per_mtok, offer.pricing.output_usd_per_mtok
                    )

        for name, entry in self.registry.free_providers.items():
            summary = summaries.setdefault(name, ProviderSummary(provider=name))
            summary.via = entry.via
            summary.free_tier = entry.free_tier
            summary.free_notes = entry.notes
            summary.source_url = entry.source_url
            summary.verified_at = entry.verified_at

        return sorted(summaries.values(), key=lambda item: item.provider)

    async def build_provider_config(
        self,
        model_id: str,
        provider: str | None,
        target: str,
    ) -> dict[str, Any]:
        record = await self.get_model(model_id)
        offer = _select_offer(record, provider)
        if offer is None:
            raise ModelNotFoundError(model_id)
        free = classify_offer(offer, self.registry, record.model_id)
        call_model = f"{record.model_id}:{offer.provider}"
        base_url = f"{self.settings.router_base_url.rstrip('/')}/v1"

        config: dict[str, Any] = {
            "provider": "openai-compatible",
            "base_url": base_url,
            "model": call_model,
            "api_key_env": "HF_TOKEN",
            "free_status": free.status.value,
            "free_confidence": free.confidence,
            "warning": "Free status is dynamic; call check_free again before relying on it.",
        }
        if target == "openai-sdk":
            config["openai_python"] = (
                "from openai import OpenAI\n"
                f"client = OpenAI(base_url={base_url!r}, api_key=os.environ['HF_TOKEN'])\n"
                "completion = client.chat.completions.create("
                f'model={call_model!r}, messages=[{{"role": "user", "content": "Hello"}}])'
            )
        elif target == "rag-service":
            config["rag_service"] = {
                "llm.provider": "openai",
                "llm.model": call_model,
                "llm.base_url": base_url,
            }
        elif target == "env":
            config["env"] = {
                "LLM_PROVIDER": "openai",
                "LLM_MODEL": call_model,
                "LLM_BASE_URL": base_url,
                "LLM_API_KEY": "${HF_TOKEN}",
            }
        return config

    async def _account_quota(self, *, include_account: bool, warnings: list[str]) -> AccountQuota | None:
        if not include_account:
            return None
        if not self.api.token:
            return AccountQuota(
                source="unavailable",
                plan="anonymous",
                monthly_included_credits_usd=0.0,
                usage_api="unavailable_for_personal_account",
            )
        if not self.settings.enable_account_quota:
            warnings.append("Account quota lookup is disabled by HF_MCP_ENABLE_ACCOUNT_QUOTA=false.")
            return AccountQuota(source="disabled", plan="unknown")

        try:
            payload = await self.api.whoami()
        except HuggingFaceAPIError as exc:
            warnings.append(f"whoami-v2 failed ({exc.status_code}); account plan is unknown.")
            return AccountQuota(source="whoami-v2", plan="unknown")

        user = payload.get("auth", {}) if isinstance(payload.get("auth"), dict) else {}
        user = payload if payload.get("type") == "user" else user
        is_pro = bool(payload.get("isPro") or user.get("isPro"))
        orgs = payload.get("orgs") if isinstance(payload.get("orgs"), list) else []
        paid_org = any(isinstance(org, dict) and org.get("canPay") for org in orgs)
        plan = "pro" if is_pro else "team_or_enterprise" if paid_org else "free"
        monthly_credits = 2.0 if plan in {"pro", "team_or_enterprise"} else 0.0
        if plan == "team_or_enterprise":
            warnings.append("Team/Enterprise credits are per seat; seat count is not exposed by whoami-v2.")

        return AccountQuota(
            source="whoami-v2",
            plan=plan,
            monthly_included_credits_usd=monthly_credits,
            billing_mode=payload.get("billingMode"),
            period_end=_unix_to_datetime(payload.get("periodEnd")),
            can_pay=bool(payload.get("canPay")) if payload.get("canPay") is not None else None,
            orgs=[str(org.get("name")) for org in orgs if isinstance(org, dict) and org.get("name")],
        )

    async def _hub_metadata(self, *, query: str, task: str) -> dict[str, dict[str, Any]]:
        try:
            models = await self.api.hub_search(query=query, task=task, limit=100)
        except HuggingFaceAPIError:
            return {}
        return {str(model.get("id")): model for model in models if model.get("id")}

    async def _safe_model_info(self, model_id: str, *, full: bool = False) -> dict[str, Any]:
        try:
            return await self.api.model_info(model_id, full=full)
        except HuggingFaceAPIError:
            return {}


def _offers_from_router(model_id: str, raw: dict[str, Any]) -> list[Offer]:
    offers: list[Offer] = []
    for provider in raw.get("providers") or []:
        if not isinstance(provider, dict) or not provider.get("provider"):
            continue
        pricing = provider.get("pricing")
        price = None
        if isinstance(pricing, dict):
            price = Pricing(
                input_usd_per_mtok=_as_float(pricing.get("input")),
                output_usd_per_mtok=_as_float(pricing.get("output")),
            )
        offers.append(
            Offer(
                provider=str(provider["provider"]).lower(),
                provider_name=provider.get("provider_name"),
                status=provider.get("status"),
                context_length=_as_int(provider.get("context_length")),
                pricing=price,
                is_free=provider.get("is_free") if isinstance(provider.get("is_free"), bool) else None,
                supports_tools=_as_bool(provider.get("supports_tools")),
                supports_structured_output=_as_bool(provider.get("supports_structured_output")),
                latency_ms=_as_float(provider.get("first_token_latency_ms")),
                throughput_tps=_as_float(provider.get("throughput")),
                uptime_percent=_as_float(provider.get("uptime_last_day_percent")),
                quantization=provider.get("quantization"),
                call_model_id=f"{model_id}:{provider['provider']}",
            )
        )
    return offers


def _find_router_model(router_models: list[dict[str, Any]], model_id: str) -> dict[str, Any] | None:
    for raw in router_models:
        if str(raw.get("id") or "") == model_id:
            return raw
    lowered = model_id.lower()
    for raw in router_models:
        if str(raw.get("id") or "").lower() == lowered:
            return raw
    return None


def _matches_task(raw: dict[str, Any], task: str) -> bool:
    architecture = raw.get("architecture") if isinstance(raw.get("architecture"), dict) else {}
    output = [str(item) for item in (architecture.get("output_modalities") or [])]
    input_modalities = [str(item) for item in (architecture.get("input_modalities") or [])]
    if task in {"text-generation", "conversational", "chat"}:
        return "text" in output
    if task == "image-text-to-text":
        return "text" in output and "image" in input_modalities
    if task in {"embeddings", "feature-extraction"}:
        return False
    return True


def _task_from_router(raw: dict[str, Any]) -> str:
    architecture = raw.get("architecture") if isinstance(raw.get("architecture"), dict) else {}
    if "image" in [str(item) for item in (architecture.get("input_modalities") or [])]:
        return "image-text-to-text"
    return "text-generation"


def _select_offer(record: ModelRecord, provider: str | None) -> Offer | None:
    offers = [offer for offer in record.offers if provider is None or offer.provider == provider.lower()]
    if not offers:
        return None
    return max(
        offers,
        key=lambda offer: (
            bool(offer.is_free),
            bool(offer.pricing and offer.pricing.is_zero()),
            bool(offer.supports_tools),
            offer.context_length or 0,
        ),
    )


def _collect_numbers(value: Any, keys: set[str], path: str = "") -> list[int]:
    found: list[int] = []
    if isinstance(value, dict):
        for key, item in value.items():
            next_path = f"{path}{key}."
            if key in keys and isinstance(item, (int, float)) and not isinstance(item, bool):
                found.append(int(item))
            found.extend(_collect_numbers(item, keys, next_path))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            found.extend(_collect_numbers(item, keys, f"{path}{index}."))
    return [item for item in found if item > 0]


def _max_value(values: list[int]) -> int | None:
    return max(values) if values else None


def _min_optional(current: float | None, candidate: float | None) -> float | None:
    if candidate is None:
        return current
    if current is None:
        return candidate
    return min(current, candidate)


def _source_for_context(config_context: int | None, tokenizer_context: int | None) -> str | None:
    sources: list[str] = []
    if config_context is not None:
        sources.append("config.max_position_embeddings")
    if tokenizer_context is not None:
        sources.append("tokenizer_config.model_max_length")
    return " + ".join(sources) if sources else None


def _zero_gpu_quota(plan: str) -> ZeroGpuQuota:
    tiers = {
        "anonymous": ("unauthenticated", 2),
        "free": ("free", 5),
        "pro": ("pro", 40),
        "team_or_enterprise": ("team_or_enterprise", None),
    }
    tier, minutes = tiers.get(plan, ("unknown", None))
    return ZeroGpuQuota(tier=tier, daily_quota_minutes=minutes)


def _unix_to_datetime(value: Any) -> datetime | None:
    if not isinstance(value, (int, float)):
        return None
    try:
        return datetime.fromtimestamp(value, tz=UTC)
    except (OverflowError, OSError, ValueError):
        return None


def _as_int(value: Any) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _as_float(value: Any) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_bool(value: Any) -> bool | None:
    return value if isinstance(value, bool) else None
