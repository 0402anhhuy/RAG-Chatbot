"""Generic MCP server exposing the catalog tools on top of any CatalogBackend."""

from __future__ import annotations

from typing import Any

from mcp.server.mcpserver import MCPServer

from mcp_core.service import CatalogService


def build_server(
    service: CatalogService,
    *,
    name: str,
    version: str = "0.1.0",
    instructions: str | None = None,
) -> MCPServer:
    server = MCPServer(
        name=name,
        version=version,
        instructions=instructions
        or (
            "Discover AI models and providers, verify whether an offer is free, "
            "read context/output token limits, and inspect quota signals. "
            "Never present an unverified offer as free."
        ),
    )

    @server.tool()
    async def search_free_models(
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
        """Search models and offers, with free status evidence and optional token limits.

        Args:
            query: Text matched against model ids/authors.
            task: Pipeline task such as text-generation, image-text-to-text, embeddings.
            provider: Restrict to one inference provider.
            free_only: Return only offers with verified/promotional/known free status.
            include_unknown: Include offers whose price/free status is unknown.
            min_context: Minimum context window in tokens.
            min_output_tokens: Requested max output tokens; unknown values are marked unverified.
            require_tools: Require native tool calling support.
            include_limits: Fetch context/max-output limits for the top candidates.
            sort: recommended, downloads, cheapest, or fastest.
            limit: Maximum number of models to return (1-50).
        """
        return await service.search(
            query=query,
            task=task,
            provider=provider,
            free_only=free_only,
            include_unknown=include_unknown,
            min_context=min_context,
            min_output_tokens=min_output_tokens,
            require_tools=require_tools,
            include_limits=include_limits,
            sort=sort,
            limit=limit,
        )

    @server.tool()
    async def get_model_offers(model_id: str, provider: str | None = None) -> dict[str, Any]:
        """List every provider offer for a model with pricing, free verdict, latency and throughput."""
        return await service.get_model_offers(model_id, provider)

    @server.tool()
    async def check_free(model_id: str, provider: str | None = None) -> dict[str, Any]:
        """Return a free/paid/unknown verdict with evidence and confidence for one model offer."""
        return await service.check_free(model_id, provider)

    @server.tool()
    async def get_model_limits(model_id: str, provider: str | None = None) -> dict[str, Any]:
        """Return context window, model max context, max output tokens and the source of each value."""
        return await service.get_model_limits(model_id, provider)

    @server.tool()
    async def get_quota(
        model_id: str | None = None,
        provider: str | None = None,
        include_account: bool = True,
        include_zero_gpu: bool = True,
        include_hub_rate_limit: bool = True,
        include_provider_limits: bool = True,
        organization: str | None = None,
    ) -> dict[str, Any]:
        """Inspect account plan, ZeroGPU quota, Hub API rate limit and provider free-tier limits.

        Account quota needs HF_TOKEN. Remaining personal credits are not exposed by a public API
        and are always reported as unknown instead of being guessed.
        """
        return await service.get_quota(
            model_id=model_id,
            provider=provider,
            include_account=include_account,
            include_zero_gpu=include_zero_gpu,
            include_hub_rate_limit=include_hub_rate_limit,
            include_provider_limits=include_provider_limits,
            organization=organization,
        )

    @server.tool()
    async def list_providers(only_free: bool = False, task: str | None = None) -> dict[str, Any]:
        """List inference providers with model counts, free flags and registry notes."""
        return await service.list_providers(only_free=only_free, task=task)

    @server.tool()
    async def recommend_free_model(
        use_case: str,
        task: str = "text-generation",
        require_tools: bool = False,
        min_context: int | None = None,
        language: str | None = None,
        max_latency_ms: float | None = None,
        allow_paid_fallback: bool = True,
    ) -> dict[str, Any]:
        """Recommend up to three models for a use case, with free evidence and quota caveats."""
        return await service.recommend(
            use_case=use_case,
            task=task,
            require_tools=require_tools,
            min_context=min_context,
            language=language,
            max_latency_ms=max_latency_ms,
            allow_paid_fallback=allow_paid_fallback,
        )

    @server.tool()
    async def build_provider_config(
        model_id: str,
        provider: str | None = None,
        target: str = "openai-sdk",
    ) -> dict[str, Any]:
        """Build an OpenAI-compatible config snippet for a model, including limits and caveats."""
        return await service.build_provider_config(model_id=model_id, provider=provider, target=target)

    return server
