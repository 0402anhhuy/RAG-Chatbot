"""Qdrant-backed vector store adapter.

Requires the optional ``qdrant-client`` dependency. When it is missing the adapter
fails fast at construction instead of silently degrading to in-memory behaviour,
so a misconfigured production deployment cannot lose the dense index.
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping, Sequence
from typing import Any

from app.rag.stores.base import VectorStorePort, normalize_score
from app.rag.types import SearchResult, VectorRecord

_ID_NAMESPACE = uuid.UUID("6f1d4d9c-2b57-4c1a-9f6e-1a2b3c4d5e6f")
_DISTANCES = {"cosine": "Cosine", "dot": "Dot", "l2": "Euclid"}


def _point_id(record_id: str) -> str:
    """Map an arbitrary stable record id to a deterministic Qdrant UUID."""
    return str(uuid.uuid5(_ID_NAMESPACE, record_id))


def _as_filter(models: Any, filters: Mapping[str, Any] | None) -> Any | None:
    if not filters:
        return None
    conditions = []
    for key, expected in filters.items():
        if isinstance(expected, (list, tuple, set, frozenset)):
            conditions.append(models.FieldCondition(key=key, match=models.MatchAny(any=list(expected))))
        else:
            conditions.append(models.FieldCondition(key=key, match=models.MatchValue(value=expected)))
    return models.Filter(must=conditions)


class QdrantVectorStore(VectorStorePort):
    def __init__(
        self,
        *,
        collection_name: str = "documents",
        url: str | None = None,
        api_key: str | None = None,
        vector_size: int | None = None,
        distance: str = "cosine",
        timeout: float = 30.0,
    ) -> None:
        try:
            from qdrant_client import QdrantClient, models
        except ImportError as exc:  # pragma: no cover - depends on optional install
            raise RuntimeError(
                "qdrant-client is required for the qdrant vector store; install the 'vector' extra"
            ) from exc

        self._models = models
        self.collection_name = collection_name
        self.vector_size = vector_size
        self.distance = distance.lower()
        if url is None or url in {"", ":memory:"}:
            self._client = QdrantClient(location=":memory:")
        else:
            self._client = QdrantClient(url=url, api_key=api_key or None, timeout=int(timeout))
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        models = self._models
        if self._client.collection_exists(self.collection_name):
            info = self._client.get_collection(self.collection_name)
            vectors = info.config.params.vectors
            existing_size = getattr(vectors, "size", None)
            if existing_size is None and isinstance(vectors, Mapping):
                first = next(iter(vectors.values()), None)
                existing_size = getattr(first, "size", None)
            if existing_size is None:
                raise RuntimeError(f"Qdrant collection '{self.collection_name}' has no dense vector config")
            if self.vector_size is None:
                self.vector_size = int(existing_size)
            elif int(existing_size) != self.vector_size:
                raise RuntimeError(
                    f"Qdrant collection '{self.collection_name}' stores {existing_size}-dimension vectors "
                    f"but vector_store.vector_size is {self.vector_size}; rebuild the collection or fix the config"
                )
            return

        if self.vector_size is None:
            raise RuntimeError(
                "vector_store.vector_size must be set when the Qdrant collection does not exist yet"
            )
        distance_name = _DISTANCES.get(self.distance)
        if distance_name is None:
            raise RuntimeError(f"unsupported Qdrant distance: {self.distance}")
        self._client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=self.vector_size,
                distance=getattr(models.Distance, distance_name.upper()),
            ),
        )

    def _payload(self, record: VectorRecord) -> dict[str, Any]:
        return {**record.metadata, "_record_id": record.id}

    def add(self, record: VectorRecord) -> str:
        self.upsert(record)
        return record.id

    def upsert(self, record: VectorRecord) -> str:
        self.upsert_many([record])
        return record.id

    def upsert_many(self, records: Sequence[VectorRecord]) -> int:
        if not records:
            return 0
        points = [
            self._models.PointStruct(
                id=_point_id(record.id),
                vector=list(record.values),
                payload=self._payload(record),
            )
            for record in records
        ]
        self._client.upsert(collection_name=self.collection_name, points=points, wait=True)
        return len(points)

    def delete(self, record_id: str) -> None:
        self._client.delete(
            collection_name=self.collection_name,
            points_selector=[_point_id(record_id)],
            wait=True,
        )

    def delete_by_document(self, document_id: str) -> int:
        query_filter = _as_filter(self._models, {"document_id": document_id})
        removed = self._client.count(
            collection_name=self.collection_name,
            count_filter=query_filter,
            exact=True,
        ).count
        if removed:
            self._client.delete(
                collection_name=self.collection_name,
                points_selector=self._models.FilterSelector(filter=query_filter),
                wait=True,
            )
        return int(removed)

    def search(
        self,
        query_vector: Sequence[float],
        *,
        top_k: int,
        filters: Mapping[str, Any] | None = None,
    ) -> list[SearchResult]:
        response = self._client.query_points(
            collection_name=self.collection_name,
            query=list(query_vector),
            query_filter=_as_filter(self._models, filters),
            limit=top_k,
            with_payload=True,
        )
        results: list[SearchResult] = []
        for point in response.points:
            payload = dict(point.payload or {})
            raw_score = float(point.score)
            score = normalize_score(raw_score) if self.distance == "cosine" else raw_score
            results.append(
                SearchResult(
                    document_id=str(payload.get("document_id", "")),
                    chunk_id=str(payload.get("chunk_id", payload.get("_record_id", point.id))),
                    content=str(payload.get("content", "")),
                    score=score,
                    metadata=payload,
                )
            )
        return results

    def clear(self) -> None:
        if self._client.collection_exists(self.collection_name):
            self._client.delete_collection(self.collection_name)
        self._ensure_collection()

    def close(self) -> None:
        self._client.close()


__all__ = ["QdrantVectorStore"]
