"""Small async client for the public Hugging Face Hub and Inference Providers APIs."""

from __future__ import annotations

import asyncio
import re
import time
from typing import Any
from urllib.parse import quote

import httpx
from mcp_core.models import HubRateLimit

from mcp_hf.settings import Settings

RETRYABLE_STATUS = {429, 500, 502, 503, 504}
_RATELIMIT_VALUE = re.compile(r"(?:^|;)\s*r=(\d+)")
_RATELIMIT_RESET = re.compile(r"(?:^|;)\s*t=(\d+)")
_RATELIMIT_QUOTA = re.compile(r"(?:^|;)\s*q=(\d+)")
_RATELIMIT_WINDOW = re.compile(r"(?:^|;)\s*w=(\d+)")


class HuggingFaceAPIError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class HuggingFaceAPI:
    def __init__(
        self,
        settings: Settings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings
        self._transport = transport
        self._cache: dict[str, tuple[float, Any]] = {}
        self.last_hub_rate_limit: HubRateLimit | None = None

    @property
    def token(self) -> str | None:
        return self.settings.hf_token.get_secret_value() if self.settings.hf_token else None

    async def router_models(self) -> list[dict[str, Any]]:
        cached = self._cache_get("router:models")
        if cached is not None:
            return cached
        response = await self._request("GET", f"{self.settings.router_base_url}/v1/models")
        self._raise_for_status(response)
        payload = response.json()
        data = payload.get("data") if isinstance(payload, dict) else None
        models = data if isinstance(data, list) else []
        self._cache_set("router:models", models, self.settings.cache_ttl_seconds)
        return models

    async def hub_search(
        self,
        *,
        query: str = "",
        task: str | None = None,
        limit: int = 100,
        sort: str = "downloads",
        direction: int = -1,
        inference_provider: str = "all",
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "limit": max(1, min(limit, 100)),
            "sort": sort,
            "direction": direction,
            "inference_provider": inference_provider,
        }
        if query:
            params["search"] = query
        if task:
            params["pipeline_tag"] = task
        key = f"hub:search:{query}:{task}:{limit}:{sort}:{inference_provider}"
        cached = self._cache_get(key)
        if cached is not None:
            return cached
        response = await self._request("GET", f"{self.settings.hub_base_url}/api/models", params=params)
        self._raise_for_status(response)
        payload = response.json()
        models = payload if isinstance(payload, list) else []
        self._cache_set(key, models, self.settings.cache_ttl_seconds * 2)
        return models

    async def model_info(self, model_id: str, *, full: bool = False) -> dict[str, Any]:
        key = f"hub:model:{model_id}:{full}"
        cached = self._cache_get(key)
        if cached is not None:
            return cached
        params = {"full": "true"} if full else None
        response = await self._request(
            "GET",
            f"{self.settings.hub_base_url}/api/models/{quote(model_id, safe='/')}",
            params=params,
        )
        self._raise_for_status(response)
        payload = response.json()
        info = payload if isinstance(payload, dict) else {}
        self._cache_set(key, info, self.settings.cache_ttl_seconds * 2)
        return info

    async def raw_json(self, model_id: str, filename: str) -> dict[str, Any] | None:
        key = f"raw:{model_id}:{filename}"
        cached = self._cache_get(key)
        if cached is not None:
            return cached
        response = await self._request(
            "GET",
            f"{self.settings.hub_base_url}/{quote(model_id, safe='/')}/raw/main/{filename}",
        )
        if response.status_code in {401, 403, 404}:
            return None
        self._raise_for_status(response)
        try:
            payload = response.json()
        except ValueError:
            return None
        result = payload if isinstance(payload, dict) else None
        self._cache_set(key, result, self.settings.cache_ttl_seconds * 2)
        return result

    async def whoami(self) -> dict[str, Any]:
        if not self.token:
            raise HuggingFaceAPIError("HF_TOKEN is not configured", status_code=401)
        cached = self._cache_get("account:whoami")
        if cached is not None:
            return cached
        response = await self._request("GET", f"{self.settings.hub_base_url}/api/whoami-v2")
        self._raise_for_status(response)
        payload = response.json()
        account = payload if isinstance(payload, dict) else {}
        self._cache_set("account:whoami", account, self.settings.account_cache_ttl_seconds)
        return account

    async def organization_usage(
        self,
        organization: str,
        *,
        start_date: str | None = None,
        end_date: str | None = None,
        limit: int = 31,
    ) -> dict[str, Any]:
        if not self.token:
            raise HuggingFaceAPIError("HF_TOKEN is not configured", status_code=401)
        params: dict[str, Any] = {"limit": max(1, min(limit, 31))}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        response = await self._request(
            "GET",
            f"{self.settings.hub_base_url}/api/organizations/{quote(organization, safe='')}/billing/usage/inference",
            params=params,
        )
        self._raise_for_status(response)
        payload = response.json()
        return payload if isinstance(payload, dict) else {}

    async def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        retries: int | None = None,
    ) -> httpx.Response:
        attempts = self.settings.max_retries if retries is None else retries
        last_response: httpx.Response | None = None
        for attempt in range(attempts + 1):
            try:
                async with self._client() as client:
                    response = await client.request(method, url, params=params)
            except httpx.RequestError as exc:
                if attempt >= attempts:
                    raise HuggingFaceAPIError(f"request failed: {exc}") from exc
                await asyncio.sleep(min(2.0**attempt, 5.0))
                continue
            self._capture_rate_limit(response)
            last_response = response
            if response.status_code not in RETRYABLE_STATUS or attempt >= attempts:
                return response
            await asyncio.sleep(_retry_delay(response, attempt))
        assert last_response is not None
        return last_response

    def _client(self) -> httpx.AsyncClient:
        headers = {
            "User-Agent": self.settings.user_agent,
            "Accept": "application/json",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return httpx.AsyncClient(
            timeout=self.settings.timeout_seconds,
            transport=self._transport,
            headers=headers,
            follow_redirects=True,
        )

    def _capture_rate_limit(self, response: httpx.Response) -> None:
        if "huggingface.co" not in str(response.request.url):
            return
        policy = response.headers.get("ratelimit-policy", "")
        value = response.headers.get("ratelimit", "")
        if not policy and not value:
            return
        self.last_hub_rate_limit = HubRateLimit(
            limit=_first_int(_RATELIMIT_QUOTA, policy),
            remaining=_first_int(_RATELIMIT_VALUE, value),
            window_seconds=_first_int(_RATELIMIT_WINDOW, policy),
            reset_after_seconds=_first_int(_RATELIMIT_RESET, value),
        )

    def _cache_get(self, key: str) -> Any | None:
        entry = self._cache.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at <= time.monotonic():
            self._cache.pop(key, None)
            return None
        return value

    def _cache_set(self, key: str, value: Any, ttl_seconds: int) -> None:
        self._cache[key] = (time.monotonic() + max(0, ttl_seconds), value)

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        if response.is_success:
            return
        detail = response.text[:300].replace("\n", " ")
        raise HuggingFaceAPIError(
            f"Hugging Face returned HTTP {response.status_code}: {detail}",
            status_code=response.status_code,
        )


def _first_int(pattern: re.Pattern[str], value: str) -> int | None:
    match = pattern.search(value)
    return int(match.group(1)) if match else None


def _retry_delay(response: httpx.Response, attempt: int) -> float:
    retry_after = response.headers.get("retry-after")
    if retry_after:
        try:
            return min(float(retry_after), 10.0)
        except ValueError:
            pass
    return min(2.0**attempt, 5.0)
