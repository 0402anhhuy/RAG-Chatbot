"""Binary-relevance retrieval metrics."""

from __future__ import annotations

import math
from collections.abc import Collection, Sequence


def recall_at_k(retrieved: Sequence[str], relevant: Collection[str], k: int) -> float:
    if not relevant or k <= 0:
        return 0.0
    hits = sum(1 for chunk_id in retrieved[:k] if chunk_id in relevant)
    return hits / len(relevant)


def precision_at_k(retrieved: Sequence[str], relevant: Collection[str], k: int) -> float:
    if k <= 0 or not retrieved:
        return 0.0
    considered = retrieved[:k]
    hits = sum(1 for chunk_id in considered if chunk_id in relevant)
    return hits / max(1, len(considered))


def reciprocal_rank(retrieved: Sequence[str], relevant: Collection[str]) -> float:
    for index, chunk_id in enumerate(retrieved, start=1):
        if chunk_id in relevant:
            return 1.0 / index
    return 0.0


def ndcg_at_k(retrieved: Sequence[str], relevant: Collection[str], k: int) -> float:
    if not relevant or k <= 0:
        return 0.0
    dcg = 0.0
    for index, chunk_id in enumerate(retrieved[:k], start=1):
        if chunk_id in relevant:
            dcg += 1.0 / math.log2(index + 1)
    ideal = sum(1.0 / math.log2(index + 1) for index in range(1, min(len(relevant), k) + 1))
    return dcg / ideal if ideal else 0.0


def groundedness(cited: Sequence[str], relevant: Collection[str]) -> float:
    """Share of cited chunks that are actually in the relevant set."""
    if not cited:
        return 0.0
    return sum(1 for chunk_id in cited if chunk_id in relevant) / len(cited)


__all__ = [
    "groundedness",
    "ndcg_at_k",
    "precision_at_k",
    "recall_at_k",
    "reciprocal_rank",
]
