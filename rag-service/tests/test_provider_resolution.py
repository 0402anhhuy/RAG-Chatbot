from __future__ import annotations

from app.rag.factories.llm_factory import (
    LLMFactory,
    MockLLM,
    _gemini_usage,
    _openai_usage,
)
from app.rag.llm_resolver import create_chat_model
from app.rag.provider_config import ResolvedProvider
from config.settings import get_settings


class FakeProviderClient:
    def __init__(self, resolved: ResolvedProvider | None) -> None:
        self.resolved = resolved

    def resolve(self, project_id: str | None, user_id: str | None, purpose: str = "chat"):
        return self.resolved


class FakeState:
    def __init__(self, resolved: ResolvedProvider | None) -> None:
        self.settings = get_settings()
        self.provider_config = FakeProviderClient(resolved)


class FakeRequest:
    def __init__(self, resolved: ResolvedProvider | None) -> None:
        self.app = type("App", (), {"state": FakeState(resolved)})()


def test_mock_reports_estimated_usage() -> None:
    model = MockLLM()
    answer = model.complete("hello world")

    assert answer
    assert model.last_usage is not None
    assert model.last_usage.provider == "mock"
    assert model.last_usage.estimated is True
    assert model.last_usage.prompt_tokens > 0


def test_openai_usage_parsing() -> None:
    usage = _openai_usage(
        {
            "usage": {
                "prompt_tokens": 12,
                "completion_tokens": 7,
                "prompt_tokens_details": {"cached_tokens": 3},
            }
        },
        "openai",
        "gpt-4o-mini",
    )

    assert usage.prompt_tokens == 12
    assert usage.completion_tokens == 7
    assert usage.cache_read_tokens == 3


def test_gemini_usage_parsing() -> None:
    usage = _gemini_usage(
        {
            "usageMetadata": {
                "promptTokenCount": 20,
                "candidatesTokenCount": 9,
                "cachedContentTokenCount": 4,
            }
        },
        "gemini-2.5-flash",
    )

    assert usage.prompt_tokens == 20
    assert usage.completion_tokens == 9
    assert usage.cache_read_tokens == 4


def test_factory_builds_anthropic_and_fpt_models() -> None:
    anthropic = LLMFactory.create("anthropic", api_key="sk-ant")
    fpt = LLMFactory.create("fpt", api_key="sk-fpt")

    assert anthropic.provider == "anthropic"
    assert anthropic.model_name == "claude-sonnet-4-5"
    assert fpt.provider == "fpt"
    assert fpt.model_name == "deepseek-v3"


def test_resolver_uses_project_provider() -> None:
    resolved = ResolvedProvider(
        provider="openai",
        model="gpt-4o-mini",
        api_key="sk-test",
        base_url="https://api.example/v1",
        endpoint_code="OPENAI_STANDARD",
        project_provider="OPENAI",
        purpose="chat",
    )
    request = FakeRequest(resolved)

    resolution = create_chat_model(request, project_id="project-id", user_id="user-id")  # type: ignore[arg-type]

    assert resolution.resolved is True
    assert resolution.provider == "openai"
    assert resolution.model_name == "gpt-4o-mini"


def test_resolver_falls_back_to_env_provider() -> None:
    request = FakeRequest(None)

    resolution = create_chat_model(request, project_id="project-id", user_id="user-id")  # type: ignore[arg-type]

    assert resolution.resolved is False
    assert resolution.provider == "mock"
