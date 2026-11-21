"""Client-side reranking utilities for RAG retrieval."""

from __future__ import annotations

from app.rag.types import SearchResult


class NoOpReranker:
    def rerank(self, results: list[SearchResult], *, query: str | None = None) -> list[SearchResult]:
        return results


def rerank_results(
    results: list[SearchResult],
    *,
    provider: str = "none",
    query: str | None = None,
) -> list[SearchResult]:
    """Return a reranked list; `none` simply keeps original order."""
    if provider.lower() in {"none", "disabled", "off", "null"}:
        return results
    if query is None:
        return results
    boosted: list[SearchResult] = []
    normalized_query = query.lower()
    for result in results:
        overlap = sum(1 for token in normalized_query.split() if token in result.content.lower())
        candidate = SearchResult(
            document_id=result.document_id,
            chunk_id=result.chunk_id,
            content=result.content,
            score=result.score + (overlap * 0.05),
            metadata={**result.metadata, "rerank_overlap_count": overlap},
        )
        boosted.append(candidate)
    boosted.sort(key=lambda item: item.score, reverse=True)
    return boosted
