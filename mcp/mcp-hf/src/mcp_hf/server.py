"""Compose the Hugging Face backend with the shared MCP tool server."""

from __future__ import annotations

import httpx
from mcp.server.mcpserver import MCPServer
from mcp_core.registry import load_registry
from mcp_core.server import build_server
from mcp_core.service import CatalogService

from mcp_hf.backend import HuggingFaceBackend
from mcp_hf.client import HuggingFaceAPI
from mcp_hf.settings import Settings


def build_runtime(
    settings: Settings | None = None,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> tuple[MCPServer, CatalogService]:
    resolved = settings or Settings()
    registry = load_registry(resolved.free_tiers_path, resolved.provider_limits_path)
    api = HuggingFaceAPI(resolved, transport=transport)
    backend = HuggingFaceBackend(resolved, registry, api=api)
    service = CatalogService(backend, registry)
    server = build_server(
        service,
        name="hf-free-providers",
        version="0.1.0",
        instructions=(
            "Hugging Face model/provider discovery. Use search_free_models to find offers, "
            "check_free for a verdict, get_model_limits for context/output tokens, and "
            "get_quota for account, ZeroGPU, Hub API and provider free-tier limits. "
            "Free status is dynamic: always show evidence and never guess."
        ),
    )
    return server, service


def build_hf_server(
    settings: Settings | None = None,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> MCPServer:
    server, _ = build_runtime(settings, transport=transport)
    return server
