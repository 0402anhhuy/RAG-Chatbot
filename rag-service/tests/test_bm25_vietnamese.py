from __future__ import annotations

from app.rag.retrievers.bm25 import BM25Index
from app.rag.types import DocumentChunk


def chunk(chunk_id: str, content: str) -> DocumentChunk:
    return DocumentChunk(
        chunk_id=chunk_id,
        document_id="doc-vi",
        content=content,
        chunk_index=0,
        metadata={"workspace_id": "w1", "index_version": "chunk-v2"},
    )


def test_vietnamese_query_matches_with_and_without_diacritics(tmp_path) -> None:
    index = BM25Index(tmp_path / "bm25.jsonl", strip_diacritics=True)
    index.index_documents([chunk("c1", "Học máy là một lĩnh vực của trí tuệ nhân tạo.")])

    hits = index.search("hoc may", top_k=5)

    assert [hit["chunk_id"] for hit in hits] == ["c1"]


def test_compound_tokens_are_added(tmp_path) -> None:
    index = BM25Index(tmp_path / "bm25.jsonl", expand_compounds=True)
    index.index_documents([chunk("c1", "học máy và học sâu")])

    tokens = index._tokenize("học máy")  # noqa: SLF001 - tokenizer contract
    assert "học_máy" in tokens


def test_index_version_survives_reload(tmp_path) -> None:
    path = tmp_path / "bm25.jsonl"
    index = BM25Index(path, index_version="chunk-v2")
    index.index_documents([chunk("c1", "nội dung")])
    assert index.version == "chunk-v2"

    reloaded = BM25Index(path, index_version="chunk-v3")
    reloaded.load()
    assert reloaded.version == "chunk-v2"
