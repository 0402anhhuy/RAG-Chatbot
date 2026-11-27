"""Build the chat model for a request: project/user provider first, env fallback."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, cast

from fastapi import Request

from app.core.provider_errors import ProviderError
from app.rag.factories.llm_factory import ChatModel, LLMFactory
from app.rag.provider_config import ProviderConfigClient


@dataclass(frozen=True, slots=True)
class ChatModelResolution:
    model: ChatModel
    provider: str
    model_name: str
    resolved: bool


def create_chat_model(
    request: Request,
    *,
    project_id: str | None,
    user_id: str | None,
) -> ChatModelResolution:
    settings = request.app.state.settings
    client: ProviderConfigClient | None = getattr(request.app.state, "provider_config", None)
    if client is not None and project_id:
        resolved = client.resolve(project_id, user_id, "chat")
        if resolved is not None:
            model = LLMFactory.create(
                resolved.provider,
                model_name=resolved.model,
                temperature=settings.llm.temperature,
                max_tokens=settings.llm.max_tokens,
                timeout=settings.llm.request_timeout,
                max_retries=settings.llm.max_retries,
                retry_backoff_ms=settings.llm.retry_backoff_ms,
                api_key=resolved.api_key,
                base_url=resolved.base_url,
            )
            return ChatModelResolution(
                model=model,
                provider=resolved.provider,
                model_name=resolved.model,
                resolved=True,
            )

    if settings.app.env == "production" and settings.llm.provider == "mock":
        raise ProviderError(
            "auth",
            "No project or user provider is configured for this request",
        )

    model = LLMFactory.create(
        settings.llm.provider,
        model_name=settings.llm.model,
        temperature=settings.llm.temperature,
        max_tokens=settings.llm.max_tokens,
        timeout=settings.llm.request_timeout,
        max_retries=settings.llm.max_retries,
        retry_backoff_ms=settings.llm.retry_backoff_ms,
        api_key=settings.llm.api_key.get_secret_value(),
        base_url=settings.llm.base_url,
    )
    return ChatModelResolution(
        model=model,
        provider=settings.llm.provider,
        model_name=model.model_name,
        resolved=False,
    )


def usage_of(resolution: ChatModelResolution) -> dict[str, Any] | None:
    usage = getattr(resolution.model, "last_usage", None)
    if usage is None:
        return None
    return cast(dict[str, Any], usage.to_dict())


__all__ = ["ChatModelResolution", "create_chat_model", "usage_of"]
