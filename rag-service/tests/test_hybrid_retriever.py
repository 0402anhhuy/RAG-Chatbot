from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path

from app.rag.retrievers.bm25 import BM25Index
from app.rag.retrievers.service import HybridRetriever
from app.rag.stores.in_memory import InMemoryVectorStore
from app.rag.types import VectorRecord
from config.settings import RerankerSettings, RetrievalSettings


class FixedEmbedding:
    model_name = "fixed"

    def embed_query(self, text: str) -> list[float]:
        return [1.0, 0.0]

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return [[1.0, 0.0] for _ in texts]


def build_store() -> InMemoryVectorStore:
    store = InMemoryVectorStore()
    store.upsert_many(
        [
            VectorRecord(
                id="chunk-a",
                values=[1.0, 0.0],
                metadata={
                    "document_id": "doc-a",
                    "chunk_id": "chunk-a",
                    "content": "highly relevant",
                    "workspace_id": "workspace-1",
                },
            ),
            VectorRecord(
                id="chunk-b",
                values=[0.2, 0.98],
                metadata={
                    "document_id": "doc-a",
                    "chunk_id": "chunk-b",
                    "content": "weakly relevant",
                    "workspace_id": "workspace-1",
                },
            ),
        ]
    )
    return store


def make_retriever(tmp_path: Path, **retrieval_overrides) -> HybridRetriever:
    retrieval = RetrievalSettings(**retrieval_overrides)
    return HybridRetriever(
        bm25_index=BM25Index(tmp_path / "bm25.jsonl"),
        vector_store=build_store(),
        embedding_model=FixedEmbedding(),
        retrieval_settings=retrieval,
        reranker_settings=RerankerSettings(provider="none"),
    )


def test_score_threshold_drops_weak_dense_hits(tmp_path) -> None:
    retriever = make_retriever(tmp_path, score_threshold=0.65)

    results = retriever.search("query", workspace_id="workspace-1")

    assert [result.chunk_id for result in results] == ["chunk-a"]


def test_zero_threshold_keeps_all_and_rerank_top_k_caps(tmp_path) -> None:
    retriever = make_retriever(tmp_path, score_threshold=0.0, rerank_top_k=1)

    results = retriever.search("query", workspace_id="workspace-1")

    assert len(results) == 1
    assert results[0].chunk_id == "chunk-a"


def test_workspace_filter_is_applied(tmp_path) -> None:
    retriever = make_retriever(tmp_path, score_threshold=0.0)

    assert retriever.search("query", workspace_id="other-workspace") == []
    assert retriever.search("query", workspace_id="workspace-1", document_ids=[]) == []
