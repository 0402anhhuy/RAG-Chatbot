from __future__ import annotations

import httpx
from pydantic import SecretStr

from app.rag.provider_config import ProviderConfigClient
from config.settings import ProviderConfigSettings


def settings(**overrides) -> ProviderConfigSettings:
    values = {
        "enabled": True,
        "base_url": "http://spring.test",
        "internal_token": SecretStr("internal-token"),
        "cache_ttl_seconds": 60,
        "timeout_seconds": 2,
        "failure_cooldown_seconds": 30,
    }
    values.update(overrides)
    return ProviderConfigSettings(**values)


def payload(provider: str = "OPENAI") -> dict[str, object]:
    return {
        "provider": provider,
        "providerLabel": provider,
        "endpointCode": "OPENAI_STANDARD" if provider == "OPENAI" else "FPT_CLOUD_VN",
        "baseUrl": "https://api.example/v1",
        "model": "gpt-4o-mini" if provider == "OPENAI" else "deepseek-v3",
        "apiKey": "test-api-key",
        "purpose": "chat",
        "capabilities": ["chat"],
    }


def test_resolves_and_caches(monkeypatch) -> None:
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        return httpx.Response(200, json=payload())

    client = ProviderConfigClient(settings(), transport=httpx.MockTransport(handler))

    first = client.resolve("project-id", "user-id", "chat")
    second = client.resolve("project-id", "user-id", "chat")

    assert first is not None
    assert first.provider == "openai"
    assert first.model == "gpt-4o-mini"
    assert first.api_key == "test-api-key"
    assert first.base_url == "https://api.example/v1"
    assert second is not None
    assert calls["count"] == 1
    client.close()


def test_maps_fpt_provider() -> None:
    client = ProviderConfigClient(
        settings(),
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload("FPT_CLOUD"))),
    )

    resolved = client.resolve("project-id", None, "chat")

    assert resolved is not None
    assert resolved.provider == "fpt"
    client.close()


def test_not_found_returns_none_without_tripping_breaker() -> None:
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        return httpx.Response(404, json={"error": "no provider"})

    client = ProviderConfigClient(settings(), transport=httpx.MockTransport(handler))

    assert client.resolve("project-id", None, "chat") is None
    assert client.resolve("project-id", None, "chat") is None
    assert calls["count"] == 2
    client.close()


def test_network_failure_trips_circuit(monkeypatch) -> None:
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        raise httpx.ConnectError("down", request=request)

    client = ProviderConfigClient(settings(), transport=httpx.MockTransport(handler))

    assert client.resolve("project-id", None, "chat") is None
    assert client.resolve("project-id", None, "chat") is None
    assert calls["count"] == 1
    client.close()


def test_disabled_client_never_calls() -> None:
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        return httpx.Response(200, json=payload())

    client = ProviderConfigClient(settings(enabled=False), transport=httpx.MockTransport(handler))

    assert client.resolve("project-id", "user-id") is None
    assert calls["count"] == 0
    client.close()


def test_invalid_payload_is_ignored() -> None:
    client = ProviderConfigClient(
        settings(),
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json={"provider": "UNKNOWN"})),
    )

    assert client.resolve("project-id", None) is None
    client.close()
