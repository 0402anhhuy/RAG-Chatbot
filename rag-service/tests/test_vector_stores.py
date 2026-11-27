from __future__ import annotations

from pathlib import Path

import pytest

from app.rag.stores.in_memory import InMemoryVectorStore
from app.rag.types import VectorRecord


def record(record_id: str, document_id: str, values: list[float], content: str) -> VectorRecord:
    return VectorRecord(
        id=record_id,
        values=values,
        metadata={
            "document_id": document_id,
            "chunk_id": record_id,
            "content": content,
            "workspace_id": "workspace-1",
        },
    )


def test_in_memory_delete_by_document() -> None:
    store = InMemoryVectorStore()
    store.upsert_many(
        [
            record("a1", "doc-a", [1.0, 0.0], "a one"),
            record("a2", "doc-a", [0.9, 0.1], "a two"),
            record("b1", "doc-b", [0.0, 1.0], "b one"),
        ]
    )

    removed = store.delete_by_document("doc-a")

    assert removed == 2
    results = store.search([1.0, 0.0], top_k=10)
    assert [result.chunk_id for result in results] == ["b1"]


def test_faiss_roundtrip_and_persistence(tmp_path: Path) -> None:
    faiss = pytest.importorskip("faiss")
    assert faiss is not None
    from app.rag.stores.faiss_store import FAISSVectorStore

    path = tmp_path / "faiss.index"
    store = FAISSVectorStore(index_path=str(path), vector_size=2)
    store.upsert_many(
        [
            record("a1", "doc-a", [1.0, 0.0], "a one"),
            record("b1", "doc-b", [0.0, 1.0], "b one"),
        ]
    )

    results = store.search([1.0, 0.0], top_k=10)
    assert results[0].chunk_id == "a1"
    assert results[0].score > 0.99

    filtered = store.search([1.0, 0.0], top_k=10, filters={"document_id": "doc-b"})
    assert [result.chunk_id for result in filtered] == ["b1"]

    assert store.delete_by_document("doc-a") == 1
    assert store.search([1.0, 0.0], top_k=10, filters={"document_id": "doc-a"}) == []
    store.close()

    reopened = FAISSVectorStore(index_path=str(path), vector_size=2)
    assert [result.chunk_id for result in reopened.search([0.0, 1.0], top_k=10)] == ["b1"]
    assert reopened.delete_by_document("doc-b") == 1
    reopened.close()


def test_qdrant_roundtrip_filter_and_delete() -> None:
    pytest.importorskip("qdrant_client")
    from app.rag.stores.qdrant_store import QdrantVectorStore

    store = QdrantVectorStore(collection_name="test_documents", url=":memory:", vector_size=2)
    store.upsert_many(
        [
            record("a1", "doc-a", [1.0, 0.0], "a one"),
            record("b1", "doc-b", [0.0, 1.0], "b one"),
        ]
    )

    results = store.search([1.0, 0.0], top_k=10)
    assert [result.chunk_id for result in results][0] == "a1"
    assert results[0].score > 0.99

    filtered = store.search([1.0, 0.0], top_k=10, filters={"document_id": "doc-b"})
    assert [result.chunk_id for result in filtered] == ["b1"]

    assert store.delete_by_document("doc-a") == 1
    assert store.search([1.0, 0.0], top_k=10, filters={"document_id": "doc-a"}) == []
    store.close()
