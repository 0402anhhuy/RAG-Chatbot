from __future__ import annotations

from app.rag.factories.embedding_factory import EmbeddingFactory
from app.rag.loaders import load_document_text
from app.rag.retrievers.bm25 import BM25Index
from app.rag.retrievers.hybrid import fuse_results
from app.rag.retrievers.reranker import rerank_results
from app.rag.retrievers.service import HybridRetriever
from app.rag.splitters import chunk_text
from app.rag.stores.in_memory import InMemoryVectorStore
from app.rag.types import DocumentChunk, SearchResult, VectorRecord
from config.settings import RerankerSettings, RetrievalSettings


def test_document_loader_reads_text_file(tmp_path) -> None:
    file_path = tmp_path / "sample.txt"
    file_path.write_text("Alpha beta gamma\nDelta epsilon", encoding="utf-8")

    content = load_document_text(file_path)

    assert "Alpha beta gamma" in content
    assert "Delta epsilon" in content


def test_chunking_returns_bounded_segments_with_overlap() -> None:
    text = "Sentence one. " + " ".join(["alpha" for _ in range(120)]) + " End."

    chunks = chunk_text(text, chunk_size=40, chunk_overlap=10)

    assert len(chunks) >= 2
    assert all(len(chunk) <= 40 for chunk in chunks)
    assert chunks[0] != chunks[1]
    assert chunks[0].startswith("Sentence one.")


def test_bm25_index_persists_and_searches(tmp_path) -> None:
    persist_path = tmp_path / "bm25.jsonl"
    index = BM25Index(persist_path)
    chunks = [
        DocumentChunk(
            chunk_id="chunk-1",
            document_id="doc-1",
            content="Python is a high-level programming language used for scripting and data work.",
            chunk_index=0,
            metadata={"source": "python.txt"},
        ),
        DocumentChunk(
            chunk_id="chunk-2",
            document_id="doc-2",
            content="JavaScript powers front-end interfaces and browser automation.",
            chunk_index=0,
            metadata={"source": "javascript.txt"},
        ),
    ]

    index.index_documents(chunks)
    results = index.search("python programming", top_k=5)

    assert results
    assert results[0]["chunk_id"] == "chunk-1"
    assert results[0]["content"] == chunks[0].content
    assert persist_path.exists()


def test_hybrid_retriever_filters_sparse_and_dense_results_by_workspace(tmp_path) -> None:
    index = BM25Index(tmp_path / "bm25.jsonl")
    store = InMemoryVectorStore()
    chunks = [
        DocumentChunk(
            chunk_id="chunk-a",
            document_id="doc-a",
            content="Violet retrieval policy for the north workspace.",
            chunk_index=0,
            metadata={"workspace_id": "workspace-a", "filename": "a.txt"},
        ),
        DocumentChunk(
            chunk_id="chunk-b",
            document_id="doc-b",
            content="Violet retrieval policy for the south workspace.",
            chunk_index=0,
            metadata={"workspace_id": "workspace-b", "filename": "b.txt"},
        ),
    ]
    index.index_documents(chunks)
    embedding = EmbeddingFactory.create(dimension=32)
    vectors = embedding.embed_documents([chunk.content for chunk in chunks])
    for chunk, vector in zip(chunks, vectors, strict=True):
        store.upsert(
            VectorRecord(
                id=chunk.chunk_id,
                values=vector,
                metadata={
                    **chunk.metadata,
                    "document_id": chunk.document_id,
                    "chunk_id": chunk.chunk_id,
                    "content": chunk.content,
                    "source": chunk.metadata["filename"],
                },
            )
        )
    retriever = HybridRetriever(
        bm25_index=index,
        vector_store=store,
        embedding_model=embedding,
        retrieval_settings=RetrievalSettings(),
        reranker_settings=RerankerSettings(top_k=10),
    )

    results = retriever.search("Violet retrieval", workspace_id="workspace-a")

    assert results
    assert {result.document_id for result in results} == {"doc-a"}


def test_dummy_embedding_has_configured_dimension_and_is_deterministic() -> None:
    model = EmbeddingFactory.create(dimension=16)

    first = model.embed_query("deterministic vector")
    second = model.embed_query("deterministic vector")

    assert len(first) == 16
    assert first == second


def test_hybrid_fusion_supports_rrf_and_weighted_modes() -> None:
    dense = [
        SearchResult("doc-1", "chunk-1", "Python language", 0.82, {"source": "a"}),
        SearchResult("doc-2", "chunk-2", "JavaScript", 0.6, {"source": "b"}),
    ]
    sparse = [
        SearchResult("doc-1", "chunk-1", "Python language", 0.78, {"source": "a"}),
        SearchResult("doc-3", "chunk-3", "Machine learning", 0.5, {"source": "c"}),
    ]

    rrf = fuse_results(dense, sparse, strategy="rrf")
    weighted = fuse_results(dense, sparse, strategy="weighted", dense_weight=0.7, sparse_weight=0.3)

    assert rrf[0].chunk_id == "chunk-1"
    assert weighted[0].chunk_id == "chunk-1"
    assert 0.0 <= weighted[0].score <= 1.0


def test_reranker_can_skip_or_boost_results() -> None:
    results = [
        SearchResult("doc-1", "chunk-1", "Python basics for data science", 0.8, {}),
        SearchResult("doc-2", "chunk-2", "JavaScript browser runtime", 0.6, {}),
    ]

    unchanged = rerank_results(results, provider="none", query="python")
    boosted = rerank_results(results, provider="simple", query="python")

    assert unchanged == results
    assert boosted[0].chunk_id == "chunk-1"
    assert boosted[0].score >= results[0].score
