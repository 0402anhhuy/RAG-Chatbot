from __future__ import annotations

import pytest
from pydantic import ValidationError

from config.settings import Settings


def test_yaml_defaults_load() -> None:
    settings = Settings(_env_file=None)

    assert settings.app.name == "RAG Service"
    assert settings.app.port == 8000
    assert settings.embedding.provider == "dummy"
    assert settings.vector_store.backend == "in_memory"
    assert settings.llm.provider == "mock"
    assert settings.graph.max_rewrite_retries == 2
    assert settings.upload.max_size_bytes == 15 * 1024 * 1024
    assert settings.database.path == "./data/app.db"


def test_nested_environment_overrides_yaml(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP__PORT", "8123")
    monkeypatch.setenv("APP__CORS_ORIGINS", '["https://ui.example"]')
    monkeypatch.setenv("EMBEDDING__PROVIDER", "huggingface")
    monkeypatch.setenv("VECTOR_STORE__BACKEND", "faiss")
    monkeypatch.setenv("LLM__PROVIDER", "mock")
    monkeypatch.setenv("GRAPH__MAX_REWRITE_RETRIES", "3")
    monkeypatch.setenv("UPLOAD__MAX_SIZE_BYTES", "2048")
    settings = Settings(_env_file=None)

    assert settings.app.port == 8123
    assert settings.app.cors_origins == ["https://ui.example"]
    assert settings.embedding.provider == "huggingface"
    assert settings.vector_store.backend == "faiss"
    assert settings.llm.provider == "mock"
    assert settings.graph.max_rewrite_retries == 3
    assert settings.upload.max_size_bytes == 2048


def test_invalid_cors_origin_is_rejected() -> None:
    with pytest.raises(ValidationError, match="invalid CORS origin"):
        Settings(_env_file=None, app={"cors_origins": ["https://example.test/path"]})


def test_production_requires_a_non_placeholder_api_key() -> None:
    with pytest.raises(ValidationError, match="at least one API key"):
        Settings(
            _env_file=None,
            app={"env": "production"},
            security={"enabled": True},
        )


def test_production_rejects_placeholder_api_key() -> None:
    with pytest.raises(ValidationError, match="placeholder"):
        Settings(
            _env_file=None,
            app={"env": "production"},
            security={"enabled": True, "api_key": "replace-me-with-a-secret"},
        )


def test_production_requires_long_api_keys() -> None:
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(
            _env_file=None,
            app={"env": "production"},
            security={"enabled": True, "api_key": "short-key"},
        )


def test_production_rejects_wildcard_cors() -> None:
    with pytest.raises(ValidationError, match="wildcard CORS"):
        Settings(
            _env_file=None,
            app={"env": "production", "cors_origins": ["*"]},
            security={"enabled": True, "api_key": "a-long-test-secret-that-is-long-enough-123"},
        )


def test_disabled_auth_is_only_allowed_outside_production() -> None:
    with pytest.raises(ValidationError, match="cannot be disabled"):
        Settings(
            _env_file=None,
            app={"env": "production"},
            security={"enabled": False, "api_key": "a-long-test-secret-that-is-long-enough-123"},
        )
