from __future__ import annotations

import httpx
import pytest
from mcp_core.registry import load_registry
from mcp_core.service import CatalogService

from mcp_hf.backend import HuggingFaceBackend
from mcp_hf.client import HuggingFaceAPI
from mcp_hf.server import build_runtime
from mcp_hf.settings import Settings


def test_hf_token_env_alias(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HF_TOKEN", "from-env")
    settings = Settings()
    assert settings.hf_token is not None
    assert settings.hf_token.get_secret_value() == "from-env"


@pytest.mark.asyncio
async def test_search_free_only_excludes_paid_and_unknown(service: CatalogService) -> None:
    result = await service.search(free_only=True, limit=10)
    assert result["count"] == 1
    assert result["models"][0]["model_id"] == "org/free-model"
    assert result["models"][0]["free_status"] == "verified_free"


@pytest.mark.asyncio
async def test_search_include_unknown(service: CatalogService) -> None:
    result = await service.search(free_only=False, include_unknown=True, limit=10)
    ids = {item["model_id"] for item in result["models"]}
    assert ids == {"org/free-model", "org/paid-model", "org/unknown-model"}
    unknown = next(item for item in result["models"] if item["model_id"] == "org/unknown-model")
    assert unknown["free_status"] == "unknown"


@pytest.mark.asyncio
async def test_check_free_paid(service: CatalogService) -> None:
    result = await service.check_free("org/paid-model", "nebius")
    assert result["verdict"] == "paid"
    assert result["confidence"] == 0.9


@pytest.mark.asyncio
async def test_check_free_unknown_provider(service: CatalogService) -> None:
    result = await service.check_free("org/free-model", "does-not-exist")
    assert result["verdict"] == "unknown"
    assert result["confidence"] == 0.0


@pytest.mark.asyncio
async def test_limits_from_router_and_config(service: CatalogService) -> None:
    limits = await service.get_model_limits("org/free-model", "groq")
    assert limits["context_window"] == 32768
    assert limits["context_window_source"].startswith("router.providers[groq]")
    assert limits["model_max_context"] == 32768
    assert limits["max_output_tokens"] == 2048
    assert limits["confidence"] == "high"


@pytest.mark.asyncio
async def test_limits_missing_output_is_null_not_guessed(service: CatalogService) -> None:
    limits = await service.get_model_limits("org/paid-model", "nebius")
    assert limits["context_window"] == 65536
    assert limits["max_output_tokens"] is None
    assert limits["max_output_tokens_source"] == "not_published"


@pytest.mark.asyncio
async def test_quota_without_token(service: CatalogService) -> None:
    quota = await service.get_quota(model_id="org/free-model", provider="groq")
    assert quota["account"]["plan"] == "anonymous"
    assert quota["zero_gpu"]["daily_quota_minutes"] == 2
    assert quota["hub_api"]["limit"] == 500
    assert quota["hub_api"]["remaining"] == 499
    assert quota["provider_free_tier"]["provider"] == "groq"
    assert quota["provider_free_tier"]["free_tier"]["rpm"] == 30
    assert quota["account"]["remaining_credits"] == "unknown"


@pytest.mark.asyncio
async def test_quota_with_token(settings: Settings, transport: httpx.MockTransport) -> None:
    fake_token = "-".join(["unit", "test"])
    token_settings = Settings(
        hf_token=fake_token,
        free_tiers_path=settings.free_tiers_path,
        provider_limits_path=settings.provider_limits_path,
    )
    registry = load_registry(token_settings.free_tiers_path, token_settings.provider_limits_path)
    api = HuggingFaceAPI(token_settings, transport=transport)
    service = CatalogService(HuggingFaceBackend(token_settings, registry, api=api), registry)

    quota = await service.get_quota(provider="groq")
    assert quota["account"]["plan"] == "pro"
    assert quota["account"]["monthly_included_credits_usd"] == 2.0
    assert quota["zero_gpu"]["daily_quota_minutes"] == 40


@pytest.mark.asyncio
async def test_list_providers(service: CatalogService) -> None:
    providers = await service.list_providers(only_free=True)
    names = {item["provider"] for item in providers["providers"]}
    assert {"groq", "cerebras"}.issubset(names)


@pytest.mark.asyncio
async def test_build_provider_config(service: CatalogService) -> None:
    config = await service.build_provider_config(model_id="org/free-model", provider="groq", target="rag-service")
    assert config["base_url"] == "https://router.huggingface.co/v1"
    assert config["model"] == "org/free-model:groq"
    assert config["rag_service"]["llm.provider"] == "openai"
    assert config["limits"]["max_output_tokens"] == 2048


@pytest.mark.asyncio
async def test_mcp_tools_are_registered(settings: Settings, transport: httpx.MockTransport) -> None:
    server, _ = build_runtime(settings, transport=transport)
    tools = await server.list_tools()
    names = {tool.name for tool in tools}
    assert names == {
        "search_free_models",
        "get_model_offers",
        "check_free",
        "get_model_limits",
        "get_quota",
        "list_providers",
        "recommend_free_model",
        "build_provider_config",
    }

    result = await server.call_tool("search_free_models", {"free_only": True})
    assert result.is_error is False
    assert "org/free-model" in result.content[0].text
