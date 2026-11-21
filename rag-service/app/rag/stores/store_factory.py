"""Factory that builds a configured vector store implementation."""

from __future__ import annotations

from app.rag.stores.base import VectorStorePort
from app.rag.stores.faiss_store import FAISSVectorStore
from app.rag.stores.in_memory import InMemoryVectorStore
from app.rag.stores.qdrant_store import QdrantVectorStore


def create_vector_store(
    backend: str = "in_memory",
    *,
    collection_name: str = "documents",
    url: str | None = None,
    api_key: str | None = None,
    persist_path: str | None = None,
    vector_size: int | None = None,
) -> VectorStorePort:
    backend_name = (backend or "in_memory").lower()
    if backend_name == "in_memory":
        return InMemoryVectorStore()
    if backend_name == "qdrant":
        return QdrantVectorStore(
            collection_name=collection_name,
            url=url,
            api_key=api_key,
            vector_size=vector_size,
        )
    if backend_name == "faiss":
        return FAISSVectorStore(index_path=persist_path, vector_size=vector_size)
    raise ValueError(f"Unsupported vector store backend: {backend}")
