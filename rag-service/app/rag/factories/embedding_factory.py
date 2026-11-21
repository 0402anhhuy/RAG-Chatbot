"""Factory-based embedding models for local and hosted providers."""

from __future__ import annotations

import hashlib
import json
import math
import re
from collections.abc import Sequence
from importlib import import_module
from importlib.util import find_spec
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class EmbeddingModel(Protocol):
    def embed_query(self, text: str) -> list[float]: ...

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]: ...


class DummyEmbeddingModel:
    """Simple deterministic embedding used for tests and local mock flows."""

    def __init__(self, *, model_name: str = "dummy", dimension: int = 384) -> None:
        self.model_name = model_name
        self.dimension = dimension

    def embed_query(self, text: str) -> list[float]:
        vector = [0.0] * self.dimension
        tokens = re.findall(r"\w+", text.lower())
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimension
            vector[index] += 1.0 if digest[4] & 1 else -1.0
        norm = math.sqrt(sum(value * value for value in vector))
        return [value / norm for value in vector] if norm else vector

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return [self.embed_query(text) for text in texts]


class OpenAIEmbeddingModel:
    def __init__(
        self,
        *,
        model_name: str,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int = 60,
        dimension: int | None = None,
    ) -> None:
        if not api_key:
            raise RuntimeError("EMBEDDING__API_KEY is required for OpenAI embeddings")
        self.model_name = model_name
        self.api_key = api_key
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
        self.timeout = timeout
        self.dimension = dimension

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        body: dict[str, object] = {"model": self.model_name, "input": list(texts)}
        if self.dimension is not None and self.model_name.startswith("text-embedding-3"):
            body["dimensions"] = self.dimension
        request = Request(
            f"{self.base_url}/embeddings",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            raise RuntimeError(f"Embedding provider returned HTTP {exc.code}") from exc
        except (URLError, TimeoutError) as exc:
            raise RuntimeError("Embedding provider request failed") from exc
        data = payload.get("data")
        if not isinstance(data, list) or len(data) != len(texts):
            raise RuntimeError("Embedding provider returned an invalid response")
        try:
            ordered = sorted(data, key=lambda item: int(item["index"]))
            return [[float(value) for value in item["embedding"]] for item in ordered]
        except (KeyError, TypeError, ValueError) as exc:
            raise RuntimeError("Embedding provider returned invalid vectors") from exc


class SentenceTransformersEmbeddingModel:
    def __init__(self, *, model_name: str, device: str = "cpu", normalize: bool = True) -> None:
        if find_spec("sentence_transformers") is None:
            raise RuntimeError("sentence-transformers is required for HuggingFace embeddings")

        self.model_name = model_name
        self.device = device
        self.normalize = normalize
        sentence_transformers: Any = import_module("sentence_transformers")
        self._model: Any = sentence_transformers.SentenceTransformer(model_name, device=device)

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors = self._model.encode(
            list(texts),
            normalize_embeddings=self.normalize,
            convert_to_numpy=True,
        )
        return [[float(value) for value in vector] for vector in vectors]


class EmbeddingFactory:
    """Create platform-appropriate embedding implementations without coupling domain code to providers."""

    @staticmethod
    def create(
        provider: str | None = None,
        *,
        model_name: str | None = None,
        device: str = "cpu",
        normalize: bool = True,
        api_key: str | None = None,
        base_url: str | None = None,
        dimension: int = 384,
    ) -> EmbeddingModel:
        normalized = (provider or "dummy").lower()
        if normalized in {"dummy", "mock", "test"}:
            return DummyEmbeddingModel(model_name=model_name or "dummy", dimension=dimension)
        if normalized in {"huggingface", "sentence_transformers", "sentence-transformers"}:
            return SentenceTransformersEmbeddingModel(
                model_name=model_name or "sentence-transformers/all-MiniLM-L6-v2",
                device=device,
                normalize=normalize,
            )
        if normalized == "openai":
            return OpenAIEmbeddingModel(
                model_name=model_name or "text-embedding-3-small",
                api_key=api_key,
                base_url=base_url,
                dimension=dimension,
            )
        raise ValueError(f"Unsupported embedding provider: {provider}")
