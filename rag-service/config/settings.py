"""Validated service settings loaded from YAML, dotenv, and environment variables."""

from __future__ import annotations

import math
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict, YamlConfigSettingsSource

CONFIG_DIR = Path(__file__).resolve().parent
SETTINGS_FILE = CONFIG_DIR / "settings.yaml"


class AppSettings(BaseModel):
    name: str = "RAG Service"
    env: Literal["development", "test", "production"] = "development"
    host: str = "127.0.0.1"
    port: int = 8000
    log_level: str = "INFO"
    log_format: Literal["json", "text"] = "json"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"])
    request_id_header: str = "X-Request-ID"
    request_timeout_seconds: float = 120.0
    max_concurrent_requests: int = 8

    @field_validator("port")
    @classmethod
    def validate_port(cls, value: int) -> int:
        if not 1 <= value <= 65535:
            raise ValueError("port must be between 1 and 65535")
        return value

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        normalized = value.upper()
        if normalized not in {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"}:
            raise ValueError("log_level must be a standard Python logging level")
        return normalized

    @field_validator("request_id_header")
    @classmethod
    def validate_request_id_header(cls, value: str) -> str:
        if not value.isascii() or not value.replace("-", "").isalnum():
            raise ValueError("request_id_header must be a valid HTTP token")
        return value

    @field_validator("request_timeout_seconds")
    @classmethod
    def validate_request_timeout(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("app.request_timeout_seconds must be positive")
        return value

    @field_validator("max_concurrent_requests")
    @classmethod
    def validate_max_concurrent_requests(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("app.max_concurrent_requests must be positive")
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: list[str]) -> list[str]:
        origins = [origin.strip().rstrip("/") for origin in value]
        if any(not origin for origin in origins):
            raise ValueError("cors_origins cannot contain an empty origin")
        for origin in origins:
            if origin == "*":
                continue
            parsed = urlsplit(origin)
            try:
                _ = parsed.port
            except ValueError as exc:
                raise ValueError(f"invalid CORS origin: {origin}") from exc
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or parsed.username is not None
                or parsed.password is not None
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError(f"invalid CORS origin: {origin}")
        return origins


class SecuritySettings(BaseModel):
    enabled: bool = True
    api_key: SecretStr = SecretStr("")
    api_keys: dict[str, SecretStr] = Field(default_factory=dict)
    require_principal: bool = False
    principal_header: str = "X-User-Id"
    principal_workspaces_header: str = "X-User-Workspaces"

    @field_validator("principal_header", "principal_workspaces_header")
    @classmethod
    def validate_principal_header(cls, value: str) -> str:
        if not value.isascii() or not value.replace("-", "").replace("_", "").isalnum():
            raise ValueError("principal headers must be valid HTTP tokens")
        return value


class RateLimitSettings(BaseModel):
    enabled: bool = False
    backend: Literal["memory", "redis"] = "memory"
    requests: int = 60
    window_seconds: int = 60
    redis_url: str = "redis://localhost:6379/0"

    @model_validator(mode="after")
    def validate_limits(self) -> RateLimitSettings:
        if self.requests < 1:
            raise ValueError("rate_limit.requests must be at least 1")
        if self.window_seconds < 1:
            raise ValueError("rate_limit.window_seconds must be at least 1")
        if self.enabled and self.backend == "redis" and not self.redis_url.strip():
            raise ValueError("rate_limit.redis_url is required when the Redis backend is enabled")
        return self


class EmbeddingSettings(BaseModel):
    provider: Literal["dummy", "huggingface", "sentence_transformers", "openai"] = "dummy"
    model: str = "sentence-transformers/all-MiniLM-L6-v2"
    dimension: int = 384
    device: Literal["cpu", "cuda", "mps"] = "cpu"
    normalize: bool = True
    api_key: SecretStr = SecretStr("")
    base_url: str | None = None
    cache_enabled: bool = True
    cache_path: str = "./data/embedding_cache.sqlite3"

    @field_validator("dimension")
    @classmethod
    def validate_dimension(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("embedding.dimension must be positive")
        return value

    @field_validator("cache_path")
    @classmethod
    def validate_cache_path(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("embedding.cache_path cannot be empty")
        return value


class VectorStoreSettings(BaseModel):
    backend: Literal["in_memory", "qdrant", "faiss"] = "in_memory"
    collection: str = "documents"
    url: str = "http://localhost:6333"
    api_key: SecretStr = SecretStr("")
    persist_path: str = "./data/vector_store"
    vector_size: int | None = None
    distance: Literal["cosine", "dot", "l2"] = "cosine"
    timeout_seconds: float = 30.0

    @field_validator("vector_size", mode="before")
    @classmethod
    def normalize_vector_size(cls, value: object) -> object:
        # An empty value in .env (e.g. ``VECTOR_STORE__VECTOR_SIZE=``) means "unset".
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("vector_size")
    @classmethod
    def validate_vector_size(cls, value: int | None) -> int | None:
        if value is not None and value <= 0:
            raise ValueError("vector_store.vector_size must be positive")
        return value


class RetrievalSettings(BaseModel):
    top_k_dense: int = 10
    top_k_sparse: int = 10
    rerank_top_k: int = 4
    score_threshold: float = 0.65
    fusion_strategy: Literal["rrf", "weighted"] = "weighted"
    rrf_k: int = 60
    dense_weight: float = 0.7
    sparse_weight: float = 0.3
    chunk_size: int = 600
    chunk_overlap: int = 100
    chunk_unit: Literal["chars", "tokens"] = "tokens"
    chunk_size_tokens: int = 512
    chunk_overlap_tokens: int = 64
    min_chunk_tokens: int = 24
    index_version: str = "chunk-v3"

    @field_validator("top_k_dense", "top_k_sparse", "rerank_top_k", "chunk_size")
    @classmethod
    def validate_positive_int(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("retrieval values must be positive")
        return value

    @field_validator("score_threshold")
    @classmethod
    def validate_score_threshold(cls, value: float) -> float:
        if not 0.0 <= value <= 1.0:
            raise ValueError("retrieval.score_threshold must be between 0 and 1")
        return value

    @field_validator("chunk_size_tokens", "min_chunk_tokens")
    @classmethod
    def validate_token_sizes(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("token chunk sizes must be positive")
        return value

    @field_validator("chunk_overlap_tokens")
    @classmethod
    def validate_token_overlap(cls, value: int) -> int:
        if value < 0:
            raise ValueError("chunk_overlap_tokens must be non-negative")
        return value

    @field_validator("index_version")
    @classmethod
    def validate_index_version(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("retrieval.index_version cannot be empty")
        return normalized

    @model_validator(mode="after")
    def validate_fusion(self) -> RetrievalSettings:
        if self.fusion_strategy == "weighted":
            total = self.dense_weight + self.sparse_weight
            if not math.isclose(total, 1.0, rel_tol=1e-6, abs_tol=1e-6):
                raise ValueError("weighted retrieval fusion weights must sum to 1.0")
        if self.chunk_overlap_tokens >= self.chunk_size_tokens:
            raise ValueError("chunk_overlap_tokens must be smaller than chunk_size_tokens")
        return self


class BM25Settings(BaseModel):
    persist_path: str = "./data/bm25_index.jsonl"
    rebuild_on_boot: bool = True
    strip_diacritics: bool = False
    expand_compounds: bool = True


class ProviderConfigSettings(BaseModel):
    enabled: bool = True
    base_url: str = "http://localhost:8080"
    internal_token: SecretStr = SecretStr("local-development-rag-internal-token-32")
    cache_ttl_seconds: int = 60
    timeout_seconds: float = 5.0
    failure_cooldown_seconds: int = 30

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, value: str) -> str:
        normalized = value.strip().rstrip("/")
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("provider_config.base_url must be an http(s) URL")
        return normalized

    @field_validator("cache_ttl_seconds", "failure_cooldown_seconds")
    @classmethod
    def validate_ttl(cls, value: int) -> int:
        if value < 0:
            raise ValueError("provider_config TTL values must be >= 0")
        return value

    @field_validator("timeout_seconds")
    @classmethod
    def validate_timeout(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("provider_config.timeout_seconds must be positive")
        return value


class LLMSettings(BaseModel):
    provider: Literal["mock", "gemini", "openai", "ollama", "vllm", "anthropic", "fpt"] = "mock"
    model: str = "mock-model"
    api_key: SecretStr = SecretStr("")
    base_url: str | None = None
    temperature: float = 0.2
    max_tokens: int = 2048
    request_timeout: int = 60
    max_retries: int = 2
    retry_backoff_ms: int = 500

    @field_validator("request_timeout", "max_tokens")
    @classmethod
    def validate_positive_limit(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("llm request_timeout and max_tokens must be positive")
        return value

    @field_validator("max_retries")
    @classmethod
    def validate_max_retries(cls, value: int) -> int:
        if not 0 <= value <= 5:
            raise ValueError("llm.max_retries must be between 0 and 5")
        return value

    @field_validator("retry_backoff_ms")
    @classmethod
    def validate_retry_backoff(cls, value: int) -> int:
        if value < 0:
            raise ValueError("llm.retry_backoff_ms must be >= 0")
        return value

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, value: float) -> float:
        if not 0.0 <= value <= 2.0:
            raise ValueError("llm.temperature must be between 0 and 2")
        return value


class PromptSettings(BaseModel):
    system_qa: str = """
    You are a careful AI assistant. Answer using only the supplied context. If the
    context does not include an answer, state that clearly and do not invent details.

    <context>
    {context}
    </context>
    """
    query_rewrite: str = (
        "Rewrite the latest user question into a self-contained search query. Return only the rewritten query."
    )
    grade_documents: str = (
        "Check whether the following snippet is relevant to answering the question: "
        '{question}. Return JSON {{"score": "yes" | "no"}}.\n\n'
        "Snippet:\n{snippet}"
    )
    fallback: str = (
        "I could not find enough supporting information in the current documents to "
        "answer this question. Please provide more context or refine the question."
    )


class GraphSettings(BaseModel):
    max_rewrite_retries: int = 2
    context_max_chars: int = 12000
    truncation_strategy: Literal["head", "tail", "middle-out"] = "tail"
    skip_rewrite_max_words: int = 8
    rewrite_cache_ttl_seconds: int = 600
    grade_batch: bool = False
    grade_batch_size: int = 5

    @field_validator("skip_rewrite_max_words", "rewrite_cache_ttl_seconds", "grade_batch_size")
    @classmethod
    def validate_non_negative(cls, value: int) -> int:
        if value < 0:
            raise ValueError("graph cost-control values must be >= 0")
        return value

    @field_validator("max_rewrite_retries")
    @classmethod
    def validate_retries(cls, value: int) -> int:
        if value < 0:
            raise ValueError("graph.max_rewrite_retries must be >= 0")
        return value


class RerankerSettings(BaseModel):
    provider: Literal["none", "simple", "cross_encoder", "cohere"] = "none"
    model: str = "BAAI/bge-reranker-v2-m3"
    api_key: SecretStr = SecretStr("")
    top_n: int = 30
    timeout_seconds: float = 20.0
    fallback_provider: Literal["none", "simple"] = "simple"

    @field_validator("top_n")
    @classmethod
    def validate_top_n(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("reranker.top_n must be positive")
        return value

    @field_validator("timeout_seconds")
    @classmethod
    def validate_timeout(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("reranker.timeout_seconds must be positive")
        return value


class IngestSettings(BaseModel):
    """Ingest worker tuning. Job state is persisted by the backend, not locally."""

    worker_timeout_seconds: int = 300
    max_attempts: int = 3
    dedup_strategy: Literal["hash", "none"] = "hash"
    worker_enabled: bool = True
    poll_interval_seconds: float = 0.25
    chunk_batch_size: int = 500

    @field_validator("poll_interval_seconds", "chunk_batch_size")
    @classmethod
    def validate_positive_value(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("ingest poll interval and chunk batch size must be positive")
        return value

    @field_validator("worker_timeout_seconds", "max_attempts")
    @classmethod
    def validate_positive_int(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("ingest values must be positive")
        return value


class UploadSettings(BaseModel):
    max_size_bytes: int = 15 * 1024 * 1024
    directory: str = "./data/uploads"

    @field_validator("max_size_bytes")
    @classmethod
    def validate_max_size_bytes(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("upload.max_size_bytes must be positive")
        return value

    @field_validator("directory")
    @classmethod
    def validate_directory(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("upload.directory cannot be empty")
        return value


class BackendSettings(BaseModel):
    """Spring backend that owns the RAG catalog, chunks, and ingest-job state.

    The RAG service keeps no relational store of its own: it only holds
    configuration (models, prompts, vector store) plus its local BM25/Qdrant
    snapshots, and talks to the backend over HTTP.
    """

    base_url: str = "http://localhost:8080"
    api_key: SecretStr = SecretStr("")
    timeout_seconds: float = 30.0

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("backend.base_url cannot be empty")
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("backend.base_url must be an http(s) URL")
        return value.rstrip("/")

    @field_validator("timeout_seconds")
    @classmethod
    def validate_timeout(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("backend.timeout_seconds must be positive")
        return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_nested_delimiter="__",
        env_file=CONFIG_DIR.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        validate_default=True,
    )

    app: AppSettings = AppSettings()
    security: SecuritySettings = SecuritySettings()
    rate_limit: RateLimitSettings = RateLimitSettings()
    embedding: EmbeddingSettings = EmbeddingSettings()
    vector_store: VectorStoreSettings = VectorStoreSettings()
    retrieval: RetrievalSettings = RetrievalSettings()
    bm25: BM25Settings = BM25Settings()
    llm: LLMSettings = LLMSettings()
    provider_config: ProviderConfigSettings = ProviderConfigSettings()
    prompts: PromptSettings = PromptSettings()
    graph: GraphSettings = GraphSettings()
    reranker: RerankerSettings = RerankerSettings()
    ingest: IngestSettings = IngestSettings()
    upload: UploadSettings = UploadSettings()
    backend: BackendSettings = BackendSettings()

    @model_validator(mode="after")
    def validate_production_security(self) -> Settings:
        if self.app.env == "production":
            configured_keys = [
                secret.get_secret_value() for secret in [self.security.api_key, *self.security.api_keys.values()]
            ]
            if not self.security.enabled:
                raise ValueError("API security cannot be disabled in production")
            if not any(key.strip() for key in configured_keys):
                raise ValueError("at least one API key must be configured in production")
            if any(key.lower().startswith(("replace-", "your-", "change-me")) for key in configured_keys):
                raise ValueError("placeholder API keys are not allowed in production")
            if any(key.strip() and len(key) < 32 for key in configured_keys):
                raise ValueError("production API keys must contain at least 32 characters")
            if "*" in self.app.cors_origins:
                raise ValueError("wildcard CORS origins are not allowed in production")
            if self.embedding.provider == "dummy":
                raise ValueError("dummy embeddings are not allowed in production")
            if self.llm.provider == "mock" and not self.provider_config.enabled:
                raise ValueError("mock LLM is not allowed in production unless provider_config is enabled")
            live_providers = {"openai", "gemini", "anthropic", "fpt"}
            if (
                self.llm.provider in live_providers
                and not self.llm.api_key.get_secret_value().strip()
            ):
                raise ValueError("a live LLM API key is required in production")
            if self.provider_config.enabled and len(self.provider_config.internal_token.get_secret_value()) < 16:
                raise ValueError("provider_config.internal_token must be at least 16 characters in production")
            if self.embedding.provider == "openai" and not self.embedding.api_key.get_secret_value().strip():
                raise ValueError("an embedding API key is required in production")
        return self

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        yaml_settings = YamlConfigSettingsSource(settings_cls, yaml_file=SETTINGS_FILE)
        return init_settings, env_settings, dotenv_settings, yaml_settings, file_secret_settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return one validated settings instance for the process."""
    return Settings()
