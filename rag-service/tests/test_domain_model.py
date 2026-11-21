from __future__ import annotations

from app.rag.hashing import make_chunk_id
from app.rag.stores.in_memory import InMemoryVectorStore
from app.rag.types import DocumentChunk, VectorRecord


def test_chunk_id_is_deterministic_across_repeated_calls() -> None:
    first = make_chunk_id("doc-1", 2, "This is a test chunk.")
    second = make_chunk_id("doc-1", 2, "This is a test chunk.")
    changed = make_chunk_id("doc-1", 3, "This is a test chunk.")

    assert first == second
    assert first != changed


def test_document_chunk_keeps_traceable_metadata() -> None:
    chunk = DocumentChunk(
        chunk_id="chunk-1",
        document_id="doc-1",
        content="Example content",
        chunk_index=1,
        page_number=4,
        section_path="intro",
        metadata={"source": "sample.pdf"},
    )

    assert chunk.page_number == 4
    assert chunk.metadata["source"] == "sample.pdf"


def test_in_memory_vector_store_respects_filters_and_similarity_order() -> None:
    store = InMemoryVectorStore()
    store.add(
        VectorRecord(
            id="vec-1",
            values=[1.0, 0.0],
            metadata={"document_id": "doc-1", "chunk_id": "chunk-1", "content": "Alpha"},
        )
    )
    store.add(
        VectorRecord(
            id="vec-2",
            values=[0.0, 1.0],
            metadata={"document_id": "doc-2", "chunk_id": "chunk-2", "content": "Beta"},
        )
    )

    filtered = store.search([1.0, 0.0], top_k=5, filters={"document_id": "doc-1"})
    ranked = store.search([1.0, 0.0], top_k=5)

    assert len(filtered) == 1
    assert filtered[0].document_id == "doc-1"
    assert ranked[0].score >= ranked[1].score
    assert ranked[0].document_id == "doc-1"

    store.close()
