"""Provider-agnostic LLM factory used by the RAG workflow."""

from __future__ import annotations

import json
import re
import time
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


class ChatModel(Protocol):
    provider: str
    model_name: str
    streaming: bool

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> str: ...

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> list[str]: ...


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
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout
        self.max_retries = max_retries

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> str:
        combined = "\n".join(part for part in [system_prompt or "", prompt] if part)
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

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> list[str]:
        return [self.complete(prompt, system_prompt=system_prompt, **kwargs)]


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
        if normalized in {"openai", "ollama", "vllm"}:
            if normalized == "openai" and not api_key:
                raise RuntimeError("LLM__API_KEY is required for OpenAI")
            default_model = {"openai": "gpt-4o-mini", "ollama": "llama3", "vllm": "gpt-4o-mini"}[normalized]
            endpoint = (
                base_url
                or {
                    "openai": "https://api.openai.com/v1",
                    "ollama": "http://localhost:11434/v1",
                    "vllm": "http://localhost:8000/v1",
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
    ) -> None:
        self.provider = provider
        self.model_name = model_name
        self.streaming = False
        self._api_key = api_key
        self._base_url = base_url
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout = timeout
        self._max_retries = max_retries

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
                if not isinstance(answer, str) or not answer.strip():
                    raise RuntimeError("Chat provider returned an empty answer")
                return answer.strip()
            except HTTPError as exc:
                if exc.code == 429 or exc.code >= 500:
                    if attempt < self._max_retries:
                        time.sleep(min(2.0, 0.25 * (2**attempt)))
                        continue
                raise RuntimeError(f"Chat provider returned HTTP {exc.code}") from exc
            except (URLError, TimeoutError) as exc:
                if attempt >= self._max_retries:
                    raise RuntimeError("Chat provider request failed") from exc
                time.sleep(min(2.0, 0.25 * (2**attempt)))
            except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
                raise RuntimeError("Chat provider returned an invalid response") from exc
        raise RuntimeError("Chat provider request failed")

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> list[str]:
        return [self.complete(prompt, system_prompt=system_prompt, **kwargs)]


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
    ) -> None:
        self.provider = "gemini"
        self.model_name = model_name
        self.streaming = False
        self._api_key = api_key
        self._base_url = base_url
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._timeout = timeout
        self._max_retries = max_retries

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
                if not isinstance(answer, str) or not answer.strip():
                    raise RuntimeError("Chat provider returned an empty answer")
                return answer.strip()
            except HTTPError as exc:
                if exc.code == 429 or exc.code >= 500:
                    if attempt < self._max_retries:
                        time.sleep(min(2.0, 0.25 * (2**attempt)))
                        continue
                raise RuntimeError(f"Chat provider returned HTTP {exc.code}") from exc
            except (URLError, TimeoutError) as exc:
                if attempt >= self._max_retries:
                    raise RuntimeError("Chat provider request failed") from exc
                time.sleep(min(2.0, 0.25 * (2**attempt)))
            except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
                raise RuntimeError("Chat provider returned an invalid response") from exc
        raise RuntimeError("Chat provider request failed")

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: Any) -> list[str]:
        return [self.complete(prompt, system_prompt=system_prompt, **kwargs)]


__all__ = ["ChatModel", "LLMFactory", "MockLLM"]
