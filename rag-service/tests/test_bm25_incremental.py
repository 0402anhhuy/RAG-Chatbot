from __future__ import annotations

from app.rag.retrievers.bm25 import BM25Index
from app.rag.types import DocumentChunk


def make_chunk(chunk_id: str, document_id: str, content: str) -> DocumentChunk:
    return DocumentChunk(
        chunk_id=chunk_id,
        document_id=document_id,
        content=content,
        chunk_index=0,
        metadata={"filename": f"{document_id}.txt"},
    )


def test_replace_document_updates_only_that_document(tmp_path) -> None:
    index = BM25Index(tmp_path / "bm25.jsonl")
    index.index_documents(
        [
            make_chunk("a1", "doc-a", "alpha beta gamma"),
            make_chunk("b1", "doc-b", "delta epsilon zeta"),
        ]
    )

    index.replace_document("doc-a", [make_chunk("a2", "doc-a", "alpha omega")])

    hits = index.search("alpha", top_k=10)
    assert [hit["chunk_id"] for hit in hits] == ["a2"]

    other_hits = index.search("epsilon", top_k=10)
    assert [hit["chunk_id"] for hit in other_hits] == ["b1"]


def test_delete_by_document_removes_only_that_document(tmp_path) -> None:
    index = BM25Index(tmp_path / "bm25.jsonl")
    index.index_documents(
        [
            make_chunk("a1", "doc-a", "alpha beta"),
            make_chunk("b1", "doc-b", "alpha delta"),
        ]
    )

    removed = index.delete_by_document("doc-a")

    assert removed == 1
    hits = index.search("alpha", top_k=10)
    assert {hit["chunk_id"] for hit in hits} == {"b1"}


def test_upsert_documents_survives_reload(tmp_path) -> None:
    path = tmp_path / "bm25.jsonl"
    index = BM25Index(path)
    index.upsert_documents([make_chunk("a1", "doc-a", "persisted content")])

    reloaded = BM25Index(path)
    reloaded.load()

    assert [hit["chunk_id"] for hit in reloaded.search("persisted", top_k=5)] == ["a1"]
