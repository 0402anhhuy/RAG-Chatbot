"""Reranking adapters used after hybrid fusion."""

from __future__ import annotations

import logging
from typing import Protocol

import httpx

from app.rag.types import SearchResult
from config.settings import RerankerSettings

logger = logging.getLogger(__name__)


class RerankerPort(Protocol):
    name: str

    def rerank(self, results: list[SearchResult], *, query: str) -> list[SearchResult]: ...


class NoOpReranker:
    name = "none"

    def rerank(self, results: list[SearchResult], *, query: str) -> list[SearchResult]:
        return results


class SimpleReranker:
    name = "simple"

    def rerank(self, results: list[SearchResult], *, query: str) -> list[SearchResult]:
        normalized_query = query.lower()
        boosted: list[SearchResult] = []
        for result in results:
            overlap = sum(1 for token in normalized_query.split() if token in result.content.lower())
            boosted.append(
                SearchResult(
                    document_id=result.document_id,
                    chunk_id=result.chunk_id,
                    content=result.content,
                    score=result.score + (overlap * 0.05),
                    metadata={**result.metadata, "rerank_overlap_count": overlap},
                )
            )
        boosted.sort(key=lambda item: item.score, reverse=True)
        return boosted


class CrossEncoderReranker:
    name = "cross_encoder"

    def __init__(self, model_name: str = "BAAI/bge-reranker-v2-m3") -> None:
        try:
            from sentence_transformers import CrossEncoder
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "sentence-transformers is required for the cross-encoder reranker"
            ) from exc
        self._model = CrossEncoder(model_name)

    def rerank(self, results: list[SearchResult], *, query: str) -> list[SearchResult]:
        if not results:
            return []
        scores = self._model.predict([[query, result.content] for result in results])
        ranked = []
        for result, raw_score in zip(results, scores, strict=True):
            ranked.append(
                SearchResult(
                    document_id=result.document_id,
                    chunk_id=result.chunk_id,
                    content=result.content,
                    score=float(raw_score),
                    metadata={**result.metadata, "rerank_score": float(raw_score)},
                )
            )
        ranked.sort(key=lambda item: item.score, reverse=True)
        return ranked


class CohereReranker:
    name = "cohere"

    def __init__(
        self,
        *,
        api_key: str,
        model_name: str = "rerank-multilingual-v3.0",
        timeout_seconds: float = 20.0,
    ) -> None:
        if not api_key.strip():
            raise RuntimeError("RERANKER__API_KEY is required for the Cohere reranker")
        self._api_key = api_key
        self._model = model_name
        self._timeout = timeout_seconds

    def rerank(self, results: list[SearchResult], *, query: str) -> list[SearchResult]:
        if not results:
            return []
        response = httpx.post(
            "https://api.cohere.com/v2/rerank",
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={
                "model": self._model,
                "query": query,
                "documents": [result.content for result in results],
                "top_n": len(results),
            },
            timeout=self._timeout,
        )
        response.raise_for_status()
        payload = response.json()
        entries = payload.get("results") if isinstance(payload, dict) else None
        if not isinstance(entries, list):
            raise RuntimeError("Cohere reranker returned an invalid response")
        ranked: list[SearchResult] = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            index = entry.get("index")
            if not isinstance(index, int) or index < 0 or index >= len(results):
                continue
            result = results[index]
            score = float(entry.get("relevance_score") or 0.0)
            ranked.append(
                SearchResult(
                    document_id=result.document_id,
                    chunk_id=result.chunk_id,
                    content=result.content,
                    score=score,
                    metadata={**result.metadata, "rerank_score": score},
                )
            )
        ranked.sort(key=lambda item: item.score, reverse=True)
        return ranked


def create_reranker(settings: RerankerSettings) -> RerankerPort:
    provider = settings.provider
    if provider == "cross_encoder":
        try:
            return CrossEncoderReranker(settings.model)
        except RuntimeError as exc:
            logger.warning("cross_encoder_reranker_unavailable", extra={"extra_fields": {"error": str(exc)}})
            return _fallback(settings)
    if provider == "cohere":
        try:
            return CohereReranker(
                api_key=settings.api_key.get_secret_value(),
                model_name=settings.model,
                timeout_seconds=settings.timeout_seconds,
            )
        except RuntimeError as exc:
            logger.warning("cohere_reranker_unavailable", extra={"extra_fields": {"error": str(exc)}})
            return _fallback(settings)
    if provider == "simple":
        return SimpleReranker()
    return NoOpReranker()


def _fallback(settings: RerankerSettings) -> RerankerPort:
    return SimpleReranker() if settings.fallback_provider == "simple" else NoOpReranker()


def rerank_results(
    results: list[SearchResult],
    *,
    provider: str = "none",
    query: str | None = None,
) -> list[SearchResult]:
    """Backward-compatible helper used by docs/tests."""
    if provider.lower() in {"none", "disabled", "off", "null"}:
        return results
    if query is None:
        return results
    return SimpleReranker().rerank(results, query=query)


__all__ = [
    "CohereReranker",
    "CrossEncoderReranker",
    "NoOpReranker",
    "RerankerPort",
    "SimpleReranker",
    "create_reranker",
    "rerank_results",
]
