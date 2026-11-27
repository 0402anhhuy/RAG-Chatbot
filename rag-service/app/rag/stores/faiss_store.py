"""FAISS-backed vector store adapter with local persistence.

Requires the optional ``faiss-cpu`` dependency (and numpy). Vectors are L2-normalised
and searched with inner product, which is equivalent to cosine similarity. Metadata
is persisted next to the index so a restart can serve the same corpus.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from app.rag.stores.base import VectorStorePort, metadata_matches, normalize_score
from app.rag.types import SearchResult, VectorRecord


class FAISSVectorStore(VectorStorePort):
    def __init__(self, *, index_path: str | None = None, vector_size: int | None = None) -> None:
        try:
            import faiss
            import numpy as np
        except ImportError as exc:  # pragma: no cover - depends on optional install
            raise RuntimeError(
                "faiss-cpu and numpy are required for the faiss vector store; install the 'vector' extra"
            ) from exc

        self._faiss = faiss
        self._np = np
        self.vector_size = vector_size
        raw_path = Path(index_path or "./data/vector_store")
        if raw_path.suffix == ".index":
            self._index_file = raw_path
            self._meta_file = raw_path.with_suffix(".meta.json")
        else:
            self._index_file = raw_path / "faiss.index"
            self._meta_file = raw_path / "faiss.meta.json"
        self._index: Any = None
        self._metadata: dict[int, dict[str, Any]] = {}
        self._ids_by_record: dict[str, int] = {}
        self._record_ids: dict[int, str] = {}
        self._next_id = 1
        self._load()

    # ---------------------------------------------------------------- lifecycle
    def _load(self) -> None:
        if self._index_file.exists():
            self._index = self._faiss.read_index(str(self._index_file))
            dimension = int(self._index.d)
            if self.vector_size is None:
                self.vector_size = dimension
            elif self.vector_size != dimension:
                raise RuntimeError(
                    f"FAISS index stores {dimension}-dimension vectors but vector_store.vector_size "
                    f"is {self.vector_size}; rebuild the index or fix the config"
                )
        if self._meta_file.exists():
            payload = json.loads(self._meta_file.read_text(encoding="utf-8"))
            self._next_id = int(payload.get("next_id", 1))
            for raw_id, entry in payload.get("records", {}).items():
                int_id = int(raw_id)
                record_id = str(entry.get("record_id", int_id))
                self._metadata[int_id] = dict(entry.get("metadata", {}))
                self._ids_by_record[record_id] = int_id
                self._record_ids[int_id] = record_id

    def _ensure_index(self, dimension: int) -> None:
        if self._index is not None:
            if int(self._index.d) != dimension:
                raise RuntimeError(f"FAISS index stores {self._index.d}-dimension vectors but received {dimension}")
            return
        if self.vector_size is not None and self.vector_size != dimension:
            raise RuntimeError(
                f"vector_store.vector_size is {self.vector_size} but embeddings have {dimension} dimensions"
            )
        self.vector_size = dimension
        flat = self._faiss.IndexFlatIP(dimension)
        self._index = self._faiss.IndexIDMap2(flat)

    def _persist(self) -> None:
        self._index_file.parent.mkdir(parents=True, exist_ok=True)
        if self._index is not None:
            self._faiss.write_index(self._index, str(self._index_file))
        payload = {
            "next_id": self._next_id,
            "records": {
                str(int_id): {
                    "record_id": self._record_ids.get(int_id, str(int_id)),
                    "metadata": metadata,
                }
                for int_id, metadata in self._metadata.items()
            },
        }
        tmp_path = self._meta_file.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        tmp_path.replace(self._meta_file)

    def _normalized(self, vector: Sequence[float]) -> Any:
        array = self._np.asarray(list(vector), dtype="float32")
        norm = float(self._np.linalg.norm(array))
        if norm > 0.0:
            array = array / norm
        return self._np.asarray([array], dtype="float32")

    # ----------------------------------------------------------------- mutation
    def add(self, record: VectorRecord) -> str:
        self.upsert(record)
        return record.id

    def upsert(self, record: VectorRecord) -> str:
        self.upsert_many([record])
        return record.id

    def upsert_many(self, records: Sequence[VectorRecord]) -> int:
        if not records:
            return 0
        for record in records:
            self._ensure_index(len(record.values))
            self._remove_record(record.id)
            int_id = self._next_id
            self._next_id += 1
            self._index.add_with_ids(
                self._normalized(record.values),
                self._np.asarray([int_id], dtype="int64"),
            )
            self._metadata[int_id] = dict(record.metadata)
            self._ids_by_record[record.id] = int_id
            self._record_ids[int_id] = record.id
        self._persist()
        return len(records)

    def _remove_record(self, record_id: str) -> bool:
        int_id = self._ids_by_record.pop(record_id, None)
        if int_id is None:
            return False
        if self._index is not None:
            self._index.remove_ids(self._np.asarray([int_id], dtype="int64"))
        self._metadata.pop(int_id, None)
        self._record_ids.pop(int_id, None)
        return True

    def delete(self, record_id: str) -> None:
        if self._remove_record(record_id):
            self._persist()

    def delete_by_document(self, document_id: str) -> int:
        stale_ids = [
            record_id
            for record_id, int_id in self._ids_by_record.items()
            if str(self._metadata.get(int_id, {}).get("document_id", "")) == document_id
        ]
        for record_id in stale_ids:
            self._remove_record(record_id)
        if stale_ids:
            self._persist()
        return len(stale_ids)

    # ------------------------------------------------------------------- query
    def search(
        self,
        query_vector: Sequence[float],
        *,
        top_k: int,
        filters: Mapping[str, Any] | None = None,
    ) -> list[SearchResult]:
        if self._index is None or not self._metadata:
            return []
        total = int(self._index.ntotal)
        if total == 0:
            return []
        limit = total if filters else min(max(top_k, 1), total)
        scores, ids = self._index.search(self._normalized(query_vector), limit)
        results: list[SearchResult] = []
        for raw_score, raw_id in zip(scores[0], ids[0], strict=True):
            int_id = int(raw_id)
            if int_id < 0:
                continue
            metadata = self._metadata.get(int_id)
            if metadata is None or not metadata_matches(metadata, filters):
                continue
            results.append(
                SearchResult(
                    document_id=str(metadata.get("document_id", "")),
                    chunk_id=str(metadata.get("chunk_id", self._record_ids.get(int_id, int_id))),
                    content=str(metadata.get("content", "")),
                    score=normalize_score(float(raw_score)),
                    metadata=metadata,
                )
            )
            if len(results) >= top_k:
                break
        return results

    def clear(self) -> None:
        self._index = None
        self._metadata = {}
        self._ids_by_record = {}
        self._record_ids = {}
        self._next_id = 1
        self._index_file.unlink(missing_ok=True)
        self._meta_file.unlink(missing_ok=True)

    def close(self) -> None:
        if self._index is not None:
            self._persist()
        self._index = None
        self._metadata = {}
        self._ids_by_record = {}
        self._record_ids = {}


__all__ = ["FAISSVectorStore"]
