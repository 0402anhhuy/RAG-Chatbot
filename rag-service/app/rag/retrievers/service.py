"""Workspace-scoped hybrid retrieval over the active chunk catalog."""

from __future__ import annotations

from collections.abc import Sequence

from app.rag.factories.embedding_factory import EmbeddingModel
from app.rag.retrievers.bm25 import BM25Index
from app.rag.retrievers.hybrid import fuse_results
from app.rag.retrievers.reranker import rerank_results
from app.rag.stores.base import VectorStorePort
from app.rag.types import SearchResult
from config.settings import RerankerSettings, RetrievalSettings


class HybridRetriever:
    def __init__(
        self,
        *,
        bm25_index: BM25Index,
        vector_store: VectorStorePort,
        embedding_model: EmbeddingModel,
        retrieval_settings: RetrievalSettings,
        reranker_settings: RerankerSettings,
    ) -> None:
        self.bm25_index = bm25_index
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        self.retrieval_settings = retrieval_settings
        self.reranker_settings = reranker_settings

    def search(
        self,
        query: str,
        *,
        workspace_id: str,
        document_ids: Sequence[str] | None = None,
    ) -> list[SearchResult]:
        if not workspace_id.strip():
            raise ValueError("workspace_id is required for retrieval")
        if document_ids is not None and not document_ids:
            return []
        filters: dict[str, object] = {"workspace_id": workspace_id}
        if document_ids is not None:
            filters["document_id"] = list(document_ids)

        dense_results = self.vector_store.search(
            self.embedding_model.embed_query(query),
            top_k=self.retrieval_settings.top_k_dense,
            filters=filters,
        )
        sparse_hits = self.bm25_index.search(
            query,
            top_k=self.retrieval_settings.top_k_sparse,
            filters=filters,
        )
        sparse_results = [
            SearchResult(
                document_id=str(hit["document_id"]),
                chunk_id=str(hit["chunk_id"]),
                content=str(hit["content"]),
                score=float(hit["score"]),
                metadata=dict(hit.get("metadata", {})),
            )
            for hit in sparse_hits
        ]
        fused = fuse_results(
            dense_results,
            sparse_results,
            strategy=self.retrieval_settings.fusion_strategy,
            rrf_k=self.retrieval_settings.rrf_k,
            dense_weight=self.retrieval_settings.dense_weight,
            sparse_weight=self.retrieval_settings.sparse_weight,
        )
        reranked = rerank_results(
            fused,
            provider=self.reranker_settings.provider,
            query=query,
        )
        return reranked[: self.reranker_settings.top_k]
