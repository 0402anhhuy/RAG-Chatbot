"""Base contract for all vector stores used by the RAG service."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping, Sequence
from typing import Any

from app.rag.types import SearchResult, VectorRecord


def normalize_score(score: float) -> float:
    """Scale cosine similarity to a 0..1 range suitable for thresholds and ranking."""
    return max(0.0, min(1.0, 0.5 * (score + 1.0)))


def metadata_matches(metadata: Mapping[str, Any], filters: Mapping[str, Any] | None) -> bool:
    if not filters:
        return True
    for key, expected in filters.items():
        actual = metadata.get(key)
        if isinstance(expected, (list, tuple, set, frozenset)):
            if actual not in expected:
                return False
        elif actual != expected:
            return False
    return True


class VectorStorePort(ABC):
    """Interface shared by in-memory, Qdrant, and FAISS-backed stores."""

    @abstractmethod
    def add(self, record: VectorRecord) -> str:
        """Persist a vector record and return its id."""

    @abstractmethod
    def upsert(self, record: VectorRecord) -> str:
        """Insert or overwrite a record by its stable identifier."""

    @abstractmethod
    def delete(self, record_id: str) -> None:
        """Delete a record if it exists."""

    @abstractmethod
    def search(
        self,
        query_vector: Sequence[float],
        *,
        top_k: int,
        filters: Mapping[str, Any] | None = None,
    ) -> list[SearchResult]:
        """Return the top-k nearest neighbors for a vector query."""

    @abstractmethod
    def clear(self) -> None:
        """Remove all stored vectors."""

    @abstractmethod
    def close(self) -> None:
        """Release any external resources owned by the store."""
