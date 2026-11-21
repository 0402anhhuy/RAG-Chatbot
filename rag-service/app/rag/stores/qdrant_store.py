"""Qdrant-compatible vector store adapter with a safe fallback implementation."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from app.rag.stores.base import VectorStorePort, metadata_matches, normalize_score
from app.rag.types import SearchResult, VectorRecord


class QdrantVectorStore(VectorStorePort):
    def __init__(
        self,
        *,
        collection_name: str = "documents",
        url: str | None = None,
        api_key: str | None = None,
        vector_size: int | None = None,
    ) -> None:
        self.collection_name = collection_name
        self.url = url or "http://localhost:6333"
        self.api_key = api_key
        self.vector_size = vector_size
        self._records: dict[str, VectorRecord] = {}

    def add(self, record: VectorRecord) -> str:
        self._records[record.id] = record
        return record.id

    def upsert(self, record: VectorRecord) -> str:
        return self.add(record)

    def delete(self, record_id: str) -> None:
        self._records.pop(record_id, None)

    def search(
        self,
        query_vector: Sequence[float],
        *,
        top_k: int,
        filters: Mapping[str, Any] | None = None,
    ) -> list[SearchResult]:
        matches: list[SearchResult] = []
        for record in self._records.values():
            if not metadata_matches(record.metadata, filters):
                continue
            similarity = _cosine_similarity(query_vector, record.values)
            matches.append(
                SearchResult(
                    document_id=str(record.metadata.get("document_id", "")),
                    chunk_id=str(record.metadata.get("chunk_id", record.id)),
                    content=str(record.metadata.get("content", "")),
                    score=normalize_score(similarity),
                    metadata=record.metadata,
                )
            )
        matches.sort(key=lambda item: item.score, reverse=True)
        return matches[:top_k]

    def clear(self) -> None:
        self._records.clear()

    def close(self) -> None:
        self.clear()


def _cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if len(left) != len(right):
        return 0.0
    left_norm = float(sum(value * value for value in left) ** 0.5)
    right_norm = float(sum(value * value for value in right) ** 0.5)
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    dot = float(sum(left[index] * right[index] for index in range(len(left))))
    return float(dot / (left_norm * right_norm))
