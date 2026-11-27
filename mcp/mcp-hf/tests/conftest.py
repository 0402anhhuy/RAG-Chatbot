from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import unquote

import httpx
import pytest
from mcp_core.registry import load_registry
from mcp_core.service import CatalogService

from mcp_hf.backend import HuggingFaceBackend
from mcp_hf.client import HuggingFaceAPI
from mcp_hf.settings import Settings

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


ROUTER = _load("router_models.json")
CONFIG = _load("model_config.json")
HUB = [
    {"id": "org/free-model", "downloads": 1000, "likes": 10, "tags": ["text-generation"], "createdAt": "2026-01-01"},
    {"id": "org/paid-model", "downloads": 5000, "likes": 50, "tags": ["text-generation"], "createdAt": "2026-01-02"},
    {"id": "org/unknown-model", "downloads": 10, "likes": 1, "tags": ["text-generation"], "createdAt": "2026-01-03"},
]
WHOAMI = {
    "type": "user",
    "id": "u1",
    "name": "tester",
    "isPro": True,
    "canPay": True,
    "billingMode": "prepaid",
    "periodEnd": 1893456000,
    "orgs": [],
    "auth": {"type": "access_token", "accessToken": {"displayName": "test"}},
}


def handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path == "/v1/models":
        return httpx.Response(200, json=ROUTER)
    if path == "/api/models":
        return httpx.Response(
            200,
            json=HUB,
            headers={
                "ratelimit-policy": '"fixed window";"api";q=500;w=300',
                "ratelimit": '"api";r=499;t=216',
            },
        )
    if path == "/api/whoami-v2":
        return httpx.Response(200, json=WHOAMI)
    if "/billing/usage/inference" in path:
        return httpx.Response(200, json={"usage": [], "organization": "acme"})
    if path.startswith("/api/models/"):
        model_id = unquote(path.removeprefix("/api/models/"))
        info = next((item for item in HUB if item["id"] == model_id), None)
        if info is None:
            return httpx.Response(404, json={"error": "not found"})
        return httpx.Response(200, json=info)
    if path.endswith("/raw/main/config.json"):
        if "free-model" in path:
            return httpx.Response(200, json=CONFIG)
        if "paid-model" in path:
            return httpx.Response(200, json={"max_position_embeddings": 65536})
        return httpx.Response(401, json={"error": "gated"})
    if path.endswith("/raw/main/tokenizer_config.json"):
        if "free-model" in path:
            return httpx.Response(200, json={"model_max_length": 32768})
        return httpx.Response(404, json={"error": "not found"})
    if path.endswith("/raw/main/generation_config.json"):
        if "free-model" in path:
            return httpx.Response(200, json={"max_new_tokens": 2048})
        return httpx.Response(404, json={"error": "not found"})
    return httpx.Response(404, json={"error": "unhandled", "path": path})


@pytest.fixture
def transport() -> httpx.MockTransport:
    return httpx.MockTransport(handler)


@pytest.fixture
def settings() -> Settings:
    return Settings(hf_token=None)


@pytest.fixture
def service(settings: Settings, transport: httpx.MockTransport) -> CatalogService:
    registry = load_registry(settings.free_tiers_path, settings.provider_limits_path)
    api = HuggingFaceAPI(settings, transport=transport)
    backend = HuggingFaceBackend(settings, registry, api=api)
    return CatalogService(backend, registry)
