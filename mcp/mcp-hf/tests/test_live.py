from __future__ import annotations

import os

import pytest

from mcp_hf.client import HuggingFaceAPI
from mcp_hf.settings import Settings

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(os.environ.get("HF_MCP_LIVE") != "1", reason="set HF_MCP_LIVE=1 to hit public endpoints"),
]


@pytest.mark.asyncio
async def test_live_router_listing() -> None:
    api = HuggingFaceAPI(Settings(hf_token=None))
    models = await api.router_models()
    assert models
    assert "providers" in models[0]


@pytest.mark.asyncio
async def test_live_hub_search() -> None:
    api = HuggingFaceAPI(Settings(hf_token=None))
    models = await api.hub_search(query="qwen", task="text-generation", limit=3)
    assert models
    assert api.last_hub_rate_limit is not None
