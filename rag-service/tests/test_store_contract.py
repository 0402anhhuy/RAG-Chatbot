from __future__ import annotations

from app.rag.factories.embedding_factory import EmbeddingFactory
from app.rag.stores.faiss_store import FAISSVectorStore
from app.rag.stores.in_memory import InMemoryVectorStore
from app.rag.stores.qdrant_store import QdrantVectorStore
from app.rag.types import VectorRecord


def test_embedding_factory_creates_a_dummy_model_by_default() -> None:
    model = EmbeddingFactory.create()
    vectors = model.embed_documents(["alpha", "beta"])

    assert len(vectors) == 2
    assert all(len(vector) == model.dimension for vector in vectors)


def test_in_memory_store_contract_is_ordered_and_filtered() -> None:
    store = InMemoryVectorStore()
    store.add(
        VectorRecord(
            id="chunk-1",
            values=[1.0, 0.0],
            metadata={"document_id": "doc-1", "chunk_id": "chunk-1", "content": "Alpha"},
        )
    )
    store.add(
        VectorRecord(
            id="chunk-2",
            values=[0.0, 1.0],
            metadata={"document_id": "doc-2", "chunk_id": "chunk-2", "content": "Beta"},
        )
    )

    filtered = store.search([1.0, 0.0], top_k=5, filters={"document_id": "doc-1"})
    ranked = store.search([1.0, 0.0], top_k=5)

    assert len(filtered) == 1
    assert filtered[0].document_id == "doc-1"
    assert ranked[0].score >= ranked[1].score
    assert 0.0 <= ranked[0].score <= 1.0

    store.close()


def test_qdrant_and_faiss_adapters_preserve_score_and_filter_contract() -> None:
    qdrant = QdrantVectorStore(collection_name="docs")
    faiss = FAISSVectorStore()
    qdrant.add(
        VectorRecord(
            id="q-1",
            values=[1.0, 0.5],
            metadata={"document_id": "doc-a", "chunk_id": "c1", "content": "Alpha"},
        )
    )
    faiss.add(
        VectorRecord(
            id="f-1",
            values=[1.0, 0.5],
            metadata={"document_id": "doc-a", "chunk_id": "c1", "content": "Alpha"},
        )
    )

    q_result = qdrant.search([1.0, 0.0], top_k=5, filters={"document_id": "doc-a"})
    f_result = faiss.search([1.0, 0.0], top_k=5, filters={"document_id": "doc-a"})

    assert len(q_result) == 1
    assert len(f_result) == 1
    assert 0.0 <= q_result[0].score <= 1.0
    assert 0.0 <= f_result[0].score <= 1.0
    assert q_result[0].document_id == "doc-a"
    assert f_result[0].document_id == "doc-a"

    qdrant.close()
    faiss.close()
