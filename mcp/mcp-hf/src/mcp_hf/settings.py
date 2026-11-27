"""Environment-driven settings for the Hugging Face MCP server."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

PACKAGE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="HF_MCP_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    hf_token: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("HF_TOKEN", "HF_MCP_HF_TOKEN"),
    )
    hub_base_url: str = "https://huggingface.co"
    router_base_url: str = "https://router.huggingface.co"
    timeout_seconds: float = 15.0
    cache_ttl_seconds: int = 300
    account_cache_ttl_seconds: int = 600
    max_retries: int = 2

    enable_account_quota: bool = True
    enable_chat: bool = False
    transport: Literal["stdio", "streamable-http"] = "stdio"
    host: str = "127.0.0.1"
    port: int = 8765

    user_agent: str = "hf-free-providers-mcp/0.1"
    free_tiers_path: Path = PACKAGE_DIR / "data" / "free_tiers.yaml"
    provider_limits_path: Path = PACKAGE_DIR / "data" / "provider_limits.yaml"

    max_parallel_config_fetches: int = Field(default=4, ge=1, le=16)
