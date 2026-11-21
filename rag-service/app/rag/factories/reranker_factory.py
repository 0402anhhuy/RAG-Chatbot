"""Factory for rerank providers."""

from __future__ import annotations

from app.rag.retrievers.reranker import NoOpReranker, rerank_results
from app.rag.types import SearchResult


class SimpleReranker:
    def rerank(self, results: list[SearchResult], *, query: str | None = None) -> list[SearchResult]:
        return rerank_results(list(results), provider="simple", query=query)


class RerankerFactory:
    @staticmethod
    def create(provider: str = "none") -> NoOpReranker | SimpleReranker:
        normalized = (provider or "none").lower()
        if normalized in {"none", "disabled", "off"}:
            return NoOpReranker()
        if normalized == "simple":
            return SimpleReranker()
        raise ValueError(f"Unsupported reranker provider: {provider}")
