"""Provider-agnostic LLM factory used by the RAG workflow."""

from __future__ import annotations

import json
import re
import time
from collections.abc import Iterator
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.core.provider_errors import ProviderError, provider_error_from_http, retry_after_from_headers
from app.rag.types import LLMUsage


class ChatModel(Protocol):
    provider: str
    model_name: str
    streaming: bool
    last_usage: LLMUsage | None

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> str: ...

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> Iterator[str]: ...


class MockLLM:
    """Deterministic mock model for local tests and workflow validation."""

    def __init__(
        self,
        *,
        model_name: str = "mock-model",
        temperature: float = 0.2,
        max_tokens: int = 2048,
        timeout: int = 60,
        max_retries: int = 2,
    ) -> None:
        self.provider = "mock"
        self.model_name = model_name
        self.streaming = True
        self.last_usage: LLMUsage | None = None
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout
        self.max_retries = max_retries

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> str:
        combined = "\n".join(part for part in [system_prompt or "", prompt] if part)
        answer = self._answer(combined, prompt, system_prompt)
        self.last_usage = LLMUsage(
            provider=self.provider,
            model=self.model_name,
            prompt_tokens=max(1, len(combined) // 4),
            completion_tokens=max(1, len(answer) // 4),
            estimated=True,
        )
        return answer

    def _answer(self, combined: str, prompt: str, system_prompt: str | None) -> str:
        lowered = combined.lower()

        rewrite_prompt = (
            "rewrite the latest user question" in lowered
            or "rewrite the user question" in lowered
            or "self-contained retrieval query" in lowered
        ) and "return only the rewritten query" in lowered
        if rewrite_prompt or ("viết lại" in lowered and "history:" in lowered):
            return f"Rewritten query: {prompt.strip()}"
        if "check whether the following snippet" in lowered or 'return json {"score"' in lowered:
            return '{"score": "yes"}'
        if "source_chunk_id" in lowered and ("flashcards" in lowered or "multiple-choice questions" in lowered):
            source = re.search(
                r"\[source_chunk_id=([^;]+); page=([^\]]+)\]\s*\n(.*?)(?=\n\n\[source_chunk_id=|\n</context>|$)",
                prompt,
                re.DOTALL,
            )
            if source is not None and source.group(3).strip():
                chunk_id, _page, excerpt = source.groups()
                excerpt = excerpt.strip()[:500]
                if "flashcards" in lowered:
                    return json.dumps(
                        [
                            {
                                "question": "What does the selected source state?",
                                "answer": excerpt,
                                "source_chunk_id": chunk_id,
                            }
                        ],
                        ensure_ascii=False,
                    )
                return json.dumps(
                    [
                        {
                            "question": "Which statement is supported by the selected source?",
                            "options": {
                                "A": excerpt,
                                "B": "The source does not state this detail.",
                                "C": "This detail is absent from the source excerpt.",
                                "D": "The excerpt provides no supporting information.",
                            },
                            "correct_answer": "A",
                            "source_chunk_id": chunk_id,
                        }
                    ],
                    ensure_ascii=False,
                )
        if "fallback" in lowered:
            return "I could not find enough information in the provided context to answer this question."
        if "<context>" in (system_prompt or "").lower():
            context_text = system_prompt or ""
            start = context_text.find("<context>")
            end = context_text.find("</context>", start)
            if start >= 0 and end > start:
                context = context_text[start + len("<context>") : end].strip()
                if context:
                    return f"Relevant source excerpts:\n{context}"
            return "I could not find enough supporting information in the current documents to answer this question."
        return f"Answer based on the question: {prompt.strip()}"

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> Iterator[str]:
        answer = self.complete(prompt, system_prompt=system_prompt, **kwargs)
        for index in range(0, len(answer), 48):
            yield answer[index : index + 48]


class LLMFactory:
    """Return a concrete model for the selected provider, while keeping tests local and mocked."""

    @staticmethod
    def create(
        provider: str = "mock",
        *,
        model_name: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        timeout: int = 60,
        max_retries: int = 2,
        retry_backoff_ms: int = 500,
        api_key: str | None = None,
        base_url: str | None = None,
    ) -> ChatModel:
        normalized = (provider or "mock").lower()
        if normalized in {"mock", "dummy", "test"}:
            return MockLLM(
                model_name=model_name or "mock-model",
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
            )
        if normalized in {"openai", "ollama", "vllm", "fpt"}:
            if normalized in {"openai", "fpt"} and not api_key:
                raise RuntimeError(f"An API key is required for {normalized}")
            default_model = {
                "openai": "gpt-4o-mini",
                "ollama": "llama3",
                "vllm": "gpt-4o-mini",
                "fpt": "deepseek-v3",
            }[normalized]
            endpoint = (
                base_url
                or {
                    "openai": "https://api.openai.com/v1",
                    "ollama": "http://localhost:11434/v1",
                    "vllm": "http://localhost:8000/v1",
                    "fpt": "https://mkp-api.fptcloud.com/v1",
                }[normalized]
            ).rstrip("/")
            return OpenAICompatibleChatModel(
                provider=normalized,
                model_name=model_name if model_name and model_name != "mock-model" else default_model,
                api_key=api_key,
                base_url=endpoint,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
                retry_backoff_ms=retry_backoff_ms,
            )
        if normalized == "anthropic":
            if not api_key:
                raise RuntimeError("An API key is required for Anthropic")
            return AnthropicChatModel(
                model_name=model_name if model_name and model_name != "mock-model" else "claude-sonnet-4-5",
                api_key=api_key,
                base_url=(base_url or "https://api.anthropic.com/v1").rstrip("/"),
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
                retry_backoff_ms=retry_backoff_ms,
            )
        if normalized == "gemini":
            if not api_key:
                raise RuntimeError("LLM__API_KEY is required for Gemini")
            return GeminiChatModel(
                model_name=model_name if model_name and model_name != "mock-model" else "gemini-2.0-flash",
                api_key=api_key,
                base_url=(base_url or "https://generativelanguage.googleapis.com/v1beta").rstrip("/"),
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                max_retries=max_retries,
                retry_backoff_ms=retry_backoff_ms,
            )
        raise ValueError(f"Unsupported LLM provider: {provider}")


class OpenAICompatibleChatModel:
    def __init__(
        self,
        *,
        provider: str,
        model_name: str,
        api_key: str | None,
        base_url: str,
        temperature: float,
        max_tokens: int,
        timeout: int,
        max_retries: int,
        retry_backoff_ms: int = 500,
    ) -> None:
        self.provider = provider
        self.model_name = model_name
        self.streaming = False
        self.last_usage: LLMUsage | None = None
        self._api_key = api_key
        self._base_url = base_url
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout = timeout
        self._max_retries = max_retries
        self._retry_backoff_ms = retry_backoff_ms

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        body = {
            "model": self.model_name,
            "messages": messages,
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
        }
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        request = Request(
            f"{self._base_url}/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        for attempt in range(self._max_retries + 1):
            try:
                with urlopen(request, timeout=self._timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                answer = payload["choices"][0]["message"]["content"]
                self.last_usage = _openai_usage(payload, self.provider, self.model_name)
                if not isinstance(answer, str) or not answer.strip():
                    raise ProviderError(
                        "bad_response",
                        "Chat provider returned an empty answer",
                        provider=self.provider,
                    )
                return answer.strip()
            except HTTPError as exc:
                if (exc.code == 429 or exc.code >= 500) and attempt < self._max_retries:
                    self._sleep_before_retry(attempt)
                    continue
                retry_headers = dict(exc.headers.items()) if exc.headers else None
                raise provider_error_from_http(
                    exc.code,
                    provider=self.provider,
                    action="Chat provider",
                    retry_after=retry_after_from_headers(retry_headers),
                ) from exc
            except (URLError, TimeoutError) as exc:
                if attempt >= self._max_retries:
                    raise ProviderError(
                        "timeout",
                        "Chat provider request timed out",
                        provider=self.provider,
                    ) from exc
                self._sleep_before_retry(attempt)
            except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
                raise ProviderError(
                    "bad_response",
                    "Chat provider returned an invalid response",
                    provider=self.provider,
                ) from exc
        raise ProviderError("unavailable", "Chat provider request failed", provider=self.provider)

    def _sleep_before_retry(self, attempt: int) -> None:
        delay_ms = self._retry_backoff_ms * (2**attempt)
        if delay_ms > 0:
            time.sleep(min(2.0, delay_ms / 1000.0))

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> Iterator[str]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        body = {
            "model": self.model_name,
            "messages": messages,
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        request = Request(
            f"{self._base_url}/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        collected: list[str] = []
        usage_payload: dict[str, Any] = {}
        try:
            with urlopen(request, timeout=self._timeout) as response:
                for raw_line in response:
                    line = raw_line.decode("utf-8", errors="ignore").strip()
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        payload = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(payload.get("usage"), dict):
                        usage_payload = payload["usage"]
                    choices = payload.get("choices")
                    if isinstance(choices, list) and choices:
                        delta = choices[0].get("delta") if isinstance(choices[0], dict) else None
                        content = delta.get("content") if isinstance(delta, dict) else None
                        if isinstance(content, str) and content:
                            collected.append(content)
                            yield content
        except HTTPError as exc:
            retry_headers = dict(exc.headers.items()) if exc.headers else None
            raise provider_error_from_http(
                exc.code,
                provider=self.provider,
                action="Chat provider",
                retry_after=retry_after_from_headers(retry_headers),
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise ProviderError("timeout", "Chat provider stream timed out", provider=self.provider) from exc
        if usage_payload:
            raw_details = usage_payload.get("prompt_tokens_details")
            details: dict[str, Any] = raw_details if isinstance(raw_details, dict) else {}
            self.last_usage = LLMUsage(
                provider=self.provider,
                model=self.model_name,
                prompt_tokens=_as_int(usage_payload.get("prompt_tokens")),
                completion_tokens=_as_int(usage_payload.get("completion_tokens")),
                cache_read_tokens=_as_int(details.get("cached_tokens")),
            )
        else:
            self.last_usage = _estimated_usage(self.provider, self.model_name, prompt, "".join(collected))


class GeminiChatModel:
    def __init__(
        self,
        *,
        model_name: str,
        api_key: str,
        base_url: str,
        temperature: float,
        max_tokens: int,
        timeout: int,
        max_retries: int,
        retry_backoff_ms: int = 500,
    ) -> None:
        self.provider = "gemini"
        self.model_name = model_name
        self.streaming = False
        self.last_usage: LLMUsage | None = None
        self._api_key = api_key
        self._base_url = base_url
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout = timeout
        self._max_retries = max_retries
        self._retry_backoff_ms = retry_backoff_ms

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> str:
        parts = [part for part in [system_prompt, prompt] if part]
        request = Request(
            f"{self._base_url}/models/{quote(self.model_name, safe='')}:generateContent",
            data=json.dumps(
                {
                    "contents": [{"role": "user", "parts": [{"text": "\n\n".join(parts)}]}],
                    "generationConfig": {
                        "temperature": self._temperature,
                        "maxOutputTokens": self._max_tokens,
                    },
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self._api_key},
            method="POST",
        )
        for attempt in range(self._max_retries + 1):
            try:
                with urlopen(request, timeout=self._timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                answer = payload["candidates"][0]["content"]["parts"][0]["text"]
                self.last_usage = _gemini_usage(payload, self.model_name)
                if not isinstance(answer, str) or not answer.strip():
                    raise ProviderError(
                        "bad_response",
                        "Chat provider returned an empty answer",
                        provider=self.provider,
                    )
                return answer.strip()
            except HTTPError as exc:
                if (exc.code == 429 or exc.code >= 500) and attempt < self._max_retries:
                    self._sleep_before_retry(attempt)
                    continue
                retry_headers = dict(exc.headers.items()) if exc.headers else None
                raise provider_error_from_http(
                    exc.code,
                    provider=self.provider,
                    action="Chat provider",
                    retry_after=retry_after_from_headers(retry_headers),
                ) from exc
            except (URLError, TimeoutError) as exc:
                if attempt >= self._max_retries:
                    raise ProviderError(
                        "timeout",
                        "Chat provider request timed out",
                        provider=self.provider,
                    ) from exc
                self._sleep_before_retry(attempt)
            except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
                raise ProviderError(
                    "bad_response",
                    "Chat provider returned an invalid response",
                    provider=self.provider,
                ) from exc
        raise ProviderError("unavailable", "Chat provider request failed", provider=self.provider)

    def _sleep_before_retry(self, attempt: int) -> None:
        delay_ms = self._retry_backoff_ms * (2**attempt)
        if delay_ms > 0:
            time.sleep(min(2.0, delay_ms / 1000.0))

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> Iterator[str]:
        parts = [part for part in [system_prompt, prompt] if part]
        request = Request(
            f"{self._base_url}/models/{quote(self.model_name, safe='')}:streamGenerateContent?alt=sse",
            data=json.dumps(
                {
                    "contents": [{"role": "user", "parts": [{"text": "\n\n".join(parts)}]}],
                    "generationConfig": {
                        "temperature": self._temperature,
                        "maxOutputTokens": self._max_tokens,
                    },
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self._api_key},
            method="POST",
        )
        collected: list[str] = []
        try:
            with urlopen(request, timeout=self._timeout) as response:
                for raw_line in response:
                    line = raw_line.decode("utf-8", errors="ignore").strip()
                    if not line.startswith("data:"):
                        continue
                    try:
                        payload = json.loads(line[5:].strip())
                    except json.JSONDecodeError:
                        continue
                    candidates = payload.get("candidates")
                    if isinstance(candidates, list) and candidates:
                        content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
                        content_parts = content.get("parts") if isinstance(content, dict) else None
                        if isinstance(content_parts, list):
                            text = "".join(
                                str(part.get("text", ""))
                                for part in content_parts
                                if isinstance(part, dict)
                            )
                            if text:
                                collected.append(text)
                                yield text
                    if isinstance(payload.get("usageMetadata"), dict):
                        self.last_usage = _gemini_usage(payload, self.model_name)
        except HTTPError as exc:
            retry_headers = dict(exc.headers.items()) if exc.headers else None
            raise provider_error_from_http(
                exc.code,
                provider=self.provider,
                action="Chat provider",
                retry_after=retry_after_from_headers(retry_headers),
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise ProviderError("timeout", "Chat provider stream timed out", provider=self.provider) from exc
        if self.last_usage is None:
            self.last_usage = _estimated_usage(self.provider, self.model_name, prompt, "".join(collected))


def _estimated_usage(provider: str, model: str, prompt: str, answer: str) -> LLMUsage:
    return LLMUsage(
        provider=provider,
        model=model,
        prompt_tokens=max(1, len(prompt) // 4),
        completion_tokens=max(1, len(answer) // 4),
        estimated=True,
    )


def _as_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _openai_usage(payload: dict[str, Any], provider: str, model: str) -> LLMUsage:
    raw_usage = payload.get("usage")
    usage: dict[str, Any] = raw_usage if isinstance(raw_usage, dict) else {}
    raw_details = usage.get("prompt_tokens_details")
    details: dict[str, Any] = raw_details if isinstance(raw_details, dict) else {}
    return LLMUsage(
        provider=provider,
        model=model,
        prompt_tokens=_as_int(usage.get("prompt_tokens")),
        completion_tokens=_as_int(usage.get("completion_tokens")),
        cache_read_tokens=_as_int(details.get("cached_tokens")),
        estimated=False,
    )


def _gemini_usage(payload: dict[str, Any], model: str) -> LLMUsage:
    raw_metadata = payload.get("usageMetadata")
    metadata: dict[str, Any] = raw_metadata if isinstance(raw_metadata, dict) else {}
    return LLMUsage(
        provider="gemini",
        model=model,
        prompt_tokens=_as_int(metadata.get("promptTokenCount")),
        completion_tokens=_as_int(metadata.get("candidatesTokenCount")),
        cache_read_tokens=_as_int(metadata.get("cachedContentTokenCount")),
        estimated=False,
    )


class AnthropicChatModel:
    def __init__(
        self,
        *,
        model_name: str,
        api_key: str,
        base_url: str,
        temperature: float,
        max_tokens: int,
        timeout: int,
        max_retries: int,
        retry_backoff_ms: int = 500,
    ) -> None:
        self.provider = "anthropic"
        self.model_name = model_name
        self.streaming = False
        self.last_usage: LLMUsage | None = None
        self._api_key = api_key
        self._base_url = base_url
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout = timeout
        self._max_retries = max_retries
        self._retry_backoff_ms = retry_backoff_ms

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> str:
        body: dict[str, Any] = {
            "model": self.model_name,
            "max_tokens": self._max_tokens,
            "temperature": self._temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            body["system"] = system_prompt
        request = Request(
            f"{self._base_url}/messages",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-api-key": self._api_key,
                "anthropic-version": "2023-06-01",
            },
            method="POST",
        )
        for attempt in range(self._max_retries + 1):
            try:
                with urlopen(request, timeout=self._timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                blocks = payload.get("content") if isinstance(payload.get("content"), list) else []
                answer = "\n".join(
                    str(block.get("text", ""))
                    for block in blocks
                    if isinstance(block, dict) and block.get("type") == "text"
                ).strip()
                raw_usage = payload.get("usage")
                usage: dict[str, Any] = raw_usage if isinstance(raw_usage, dict) else {}
                self.last_usage = LLMUsage(
                    provider=self.provider,
                    model=self.model_name,
                    prompt_tokens=_as_int(usage.get("input_tokens")),
                    completion_tokens=_as_int(usage.get("output_tokens")),
                    cache_read_tokens=_as_int(usage.get("cache_read_input_tokens")),
                    cache_write_tokens=_as_int(usage.get("cache_creation_input_tokens")),
                    estimated=False,
                )
                if not answer:
                    raise ProviderError(
                        "bad_response",
                        "Chat provider returned an empty answer",
                        provider=self.provider,
                    )
                return answer
            except HTTPError as exc:
                if (exc.code == 429 or exc.code >= 500) and attempt < self._max_retries:
                    self._sleep_before_retry(attempt)
                    continue
                retry_headers = dict(exc.headers.items()) if exc.headers else None
                raise provider_error_from_http(
                    exc.code,
                    provider=self.provider,
                    action="Chat provider",
                    retry_after=retry_after_from_headers(retry_headers),
                ) from exc
            except (URLError, TimeoutError) as exc:
                if attempt >= self._max_retries:
                    raise ProviderError(
                        "timeout",
                        "Chat provider request timed out",
                        provider=self.provider,
                    ) from exc
                self._sleep_before_retry(attempt)
            except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
                raise ProviderError(
                    "bad_response",
                    "Chat provider returned an invalid response",
                    provider=self.provider,
                ) from exc
        raise ProviderError("unavailable", "Chat provider request failed", provider=self.provider)

    def _sleep_before_retry(self, attempt: int) -> None:
        delay_ms = self._retry_backoff_ms * (2**attempt)
        if delay_ms > 0:
            time.sleep(min(2.0, delay_ms / 1000.0))

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> Iterator[str]:
        body: dict[str, Any] = {
            "model": self.model_name,
            "max_tokens": self._max_tokens,
            "temperature": self._temperature,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
        }
        if system_prompt:
            body["system"] = system_prompt
        request = Request(
            f"{self._base_url}/messages",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-api-key": self._api_key,
                "anthropic-version": "2023-06-01",
            },
            method="POST",
        )
        collected: list[str] = []
        input_tokens = 0
        output_tokens = 0
        cache_read = 0
        cache_write = 0
        try:
            with urlopen(request, timeout=self._timeout) as response:
                for raw_line in response:
                    line = raw_line.decode("utf-8", errors="ignore").strip()
                    if not line.startswith("data:"):
                        continue
                    try:
                        payload = json.loads(line[5:].strip())
                    except json.JSONDecodeError:
                        continue
                    event_type = payload.get("type")
                    if event_type == "content_block_delta":
                        delta = payload.get("delta")
                        text = delta.get("text") if isinstance(delta, dict) else None
                        if isinstance(text, str) and text:
                            collected.append(text)
                            yield text
                    usage = payload.get("usage") or payload.get("message", {}).get("usage")
                    if isinstance(usage, dict):
                        input_tokens = max(input_tokens, _as_int(usage.get("input_tokens")))
                        output_tokens = max(output_tokens, _as_int(usage.get("output_tokens")))
                        cache_read = max(cache_read, _as_int(usage.get("cache_read_input_tokens")))
                        cache_write = max(cache_write, _as_int(usage.get("cache_creation_input_tokens")))
                    if event_type == "message_stop":
                        break
        except HTTPError as exc:
            retry_headers = dict(exc.headers.items()) if exc.headers else None
            raise provider_error_from_http(
                exc.code,
                provider=self.provider,
                action="Chat provider",
                retry_after=retry_after_from_headers(retry_headers),
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise ProviderError("timeout", "Chat provider stream timed out", provider=self.provider) from exc
        self.last_usage = LLMUsage(
            provider=self.provider,
            model=self.model_name,
            prompt_tokens=input_tokens,
            completion_tokens=output_tokens or max(1, len("".join(collected)) // 4),
            cache_read_tokens=cache_read,
            cache_write_tokens=cache_write,
            estimated=input_tokens == 0,
        )


__all__ = ["ChatModel", "LLMFactory", "MockLLM", "AnthropicChatModel"]
