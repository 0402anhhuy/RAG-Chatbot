"""Backend contract every model-catalog MCP implements."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from mcp_core.models import ModelLimits, ModelRecord, ProviderSummary, QuotaSnapshot


class CatalogBackend(ABC):
    """Provider-agnostic catalog backend.

    Implement these methods for a new source (Hugging Face, OpenRouter, Ollama,
    an internal gateway, ...) and reuse every MCP tool in mcp_core.
    """

    name: str

    @abstractmethod
    async def search_models(
        self,
        *,
        query: str,
        task: str,
        provider: str | None,
        limit: int,
    ) -> list[ModelRecord]:
        """Return model records with provider offers. Free verdicts may be empty."""

    @abstractmethod
    async def get_model(self, model_id: str) -> ModelRecord:
        """Return one model or raise ModelNotFoundError."""

    @abstractmethod
    async def get_model_limits(self, model_id: str, provider: str | None) -> ModelLimits:
        """Return token limits and their sources."""

    @abstractmethod
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
        """Return account/provider quota signals. Unknown values stay unknown."""

    @abstractmethod
    async def list_providers(self, *, task: str | None = None) -> list[ProviderSummary]:
        """Return provider summaries."""

    @abstractmethod
    async def build_provider_config(
        self,
        model_id: str,
        provider: str | None,
        target: str,
    ) -> dict[str, Any]:
        """Return a ready-to-use OpenAI-compatible config for the model."""

    async def close(self) -> None:
        """Release resources. Default is a no-op."""
        return None
