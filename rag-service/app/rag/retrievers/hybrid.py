"""Dense/sparse fusion strategies for retrieval."""

from __future__ import annotations

from app.rag.types import SearchResult


def _normalize_scores(results: list[SearchResult]) -> dict[str, float]:
    if not results:
        return {}
    minimum = min(item.score for item in results)
    maximum = max(item.score for item in results)
    if maximum == minimum:
        return {item.chunk_id: 1.0 for item in results}
    return {item.chunk_id: (item.score - minimum) / (maximum - minimum) for item in results}


def fuse_results(
    dense_results: list[SearchResult],
    sparse_results: list[SearchResult],
    *,
    strategy: str = "rrf",
    rrf_k: int = 60,
    dense_weight: float = 0.7,
    sparse_weight: float = 0.3,
) -> list[SearchResult]:
    """Combine dense and sparse retrieval results using RRF or weighted fusion."""
    if strategy.lower() == "weighted":
        dense_map = _normalize_scores(dense_results)
        sparse_map = _normalize_scores(sparse_results)
        weighted_merged: dict[str, SearchResult] = {}
        for result in dense_results + sparse_results:
            if result.chunk_id not in weighted_merged:
                weighted_merged[result.chunk_id] = result
            else:
                weighted_merged[result.chunk_id].score = max(
                    weighted_merged[result.chunk_id].score,
                    result.score,
                )
        weighted_fused: list[SearchResult] = []
        for chunk_id, result in weighted_merged.items():
            dense_score = dense_map.get(chunk_id, 0.0)
            sparse_score = sparse_map.get(chunk_id, 0.0)
            final_score = (dense_weight * dense_score) + (sparse_weight * sparse_score)
            candidate = SearchResult(
                document_id=result.document_id,
                chunk_id=result.chunk_id,
                content=result.content,
                score=final_score,
                metadata={
                    **result.metadata,
                    "dense_score": dense_score,
                    "sparse_score": sparse_score,
                },
            )
            weighted_fused.append(candidate)
        weighted_fused.sort(key=lambda item: item.score, reverse=True)
        return weighted_fused

    dense_rank = {item.chunk_id: index + 1 for index, item in enumerate(dense_results)}
    sparse_rank = {item.chunk_id: index + 1 for index, item in enumerate(sparse_results)}
    rrf_merged: dict[str, SearchResult] = {}
    for item in dense_results + sparse_results:
        if item.chunk_id not in rrf_merged:
            rrf_merged[item.chunk_id] = item
        else:
            rrf_merged[item.chunk_id].score = max(rrf_merged[item.chunk_id].score, item.score)

    ranked_fused: list[SearchResult] = []
    for chunk_id, base_result in rrf_merged.items():
        dense_term = 1.0 / (rrf_k + dense_rank.get(chunk_id, len(dense_results) + 1))
        sparse_term = 1.0 / (rrf_k + sparse_rank.get(chunk_id, len(sparse_results) + 1))
        candidate = SearchResult(
            document_id=base_result.document_id,
            chunk_id=chunk_id,
            content=base_result.content,
            score=dense_term + sparse_term,
            metadata={
                **base_result.metadata,
                "dense_rank": dense_rank.get(chunk_id),
                "sparse_rank": sparse_rank.get(chunk_id),
            },
        )
        ranked_fused.append(candidate)
    ranked_fused.sort(key=lambda item: item.score, reverse=True)
    return ranked_fused
