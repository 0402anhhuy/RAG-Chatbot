from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from app.rag.embedding_cache import EmbeddingCache
from app.rag.factories.embedding_factory import DummyEmbeddingModel
from app.rag.ingest_worker import DocumentIngestWorker
from app.rag.retrievers.bm25 import BM25Index
from app.rag.stores.in_memory import InMemoryVectorStore
from app.rag.types import IngestJob
from config.settings import Settings


class CountingEmbedding(DummyEmbeddingModel):
    def __init__(self) -> None:
        super().__init__(dimension=8)
        self.calls: list[list[str]] = []

    def embed_documents(self, texts: Any) -> list[list[float]]:
        self.calls.append(list(texts))
        return super().embed_documents(texts)


class FakeQueue:
    def mark_succeeded(self, job_id: str, *, total_chunks: int = 0, progress: float = 1.0) -> IngestJob:
        return IngestJob(id=job_id, document_id="doc", status="succeeded", total_chunks=total_chunks)

    def mark_failed(self, job_id: str, error: str) -> IngestJob | None:
        return IngestJob(id=job_id, document_id="doc", status="failed", error=error)

    def delete_job(self, job_id: str) -> None:
        return None


class FakeRegistry:
    def __init__(self, documents: dict[str, dict[str, object]]) -> None:
        self.documents = documents
        self.chunks: list[dict[str, object]] = []
        self.statuses: list[tuple[str, str, int | None, str | None]] = []

    def get_document(self, document_id: str) -> dict[str, object] | None:
        return self.documents.get(document_id)

    def replace_chunks(self, document_id: str, payload: list[dict[str, object]]) -> None:
        self.chunks = [chunk for chunk in self.chunks if chunk.get("documentId") != document_id]
        self.chunks.extend({"documentId": document_id, **chunk} for chunk in payload)

    def set_status(
        self,
        document_id: str,
        status: str,
        *,
        chunk_count: int | None = None,
        error: str | None = None,
    ) -> None:
        self.statuses.append((document_id, status, chunk_count, error))

    def list_chunks(self) -> list[dict[str, object]]:
        return list(self.chunks)

    def list_documents(self, status: str | None = None) -> list[dict[str, object]]:
        return [
            document
            for document in self.documents.values()
            if status is None or document.get("documentStatus") == status
        ]

    def count_chunks(self, document_id: str) -> int:
        return len([chunk for chunk in self.chunks if chunk.get("documentId") == document_id])


def build_worker(
    tmp_path: Path,
    documents: dict[str, dict[str, object]],
) -> tuple[DocumentIngestWorker, InMemoryVectorStore, CountingEmbedding, EmbeddingCache]:
    settings = Settings()
    embedding = CountingEmbedding()
    store = InMemoryVectorStore()
    cache = EmbeddingCache(tmp_path / "cache.sqlite3", namespace="dummy:test:True:8")
    worker = DocumentIngestWorker(
        FakeQueue(),  # type: ignore[arg-type]
        FakeRegistry(documents),  # type: ignore[arg-type]
        BM25Index(tmp_path / "bm25.jsonl"),
        settings,
        embedding,
        store,
        embedding_cache=cache,
    )
    return worker, store, embedding, cache


def write_document(tmp_path: Path, name: str, text: str) -> dict[str, object]:
    path = tmp_path / name
    path.write_text(text, encoding="utf-8")
    return {"sourcePath": str(path), "fileName": name, "workspaceId": "workspace-1"}


@pytest.mark.asyncio
async def test_ingest_is_incremental_and_cached(tmp_path: Path) -> None:
    doc_a = {"documentId": "doc-a", **write_document(tmp_path, "a.txt", "alpha beta gamma delta")}
    doc_b = {"documentId": "doc-b", **write_document(tmp_path, "b.txt", "epsilon zeta eta theta")}
    documents = {"doc-a": doc_a, "doc-b": doc_b}
    worker, store, embedding, cache = build_worker(tmp_path, documents)

    await worker._process_job("job-a", "doc-a")
    assert store.search([0.0] * 8, top_k=10, filters={"document_id": "doc-a"})
    calls_after_first = len(embedding.calls)

    await worker._process_job("job-b", "doc-b")

    assert store.search([0.0] * 8, top_k=10, filters={"document_id": "doc-a"})
    assert store.search([0.0] * 8, top_k=10, filters={"document_id": "doc-b"})
    assert worker.bm25_index.search("alpha", top_k=10, filters={"workspace_id": "workspace-1"})
    assert len(embedding.calls) == calls_after_first + 1
    assert cache.count() == 2

    await worker._process_job("job-a-again", "doc-a")
    assert len(embedding.calls) == calls_after_first + 1
    cache.close()


@pytest.mark.asyncio
async def test_delete_document_only_removes_that_document(tmp_path: Path) -> None:
    doc_a = {"documentId": "doc-a", **write_document(tmp_path, "a.txt", "alpha beta gamma")}
    doc_b = {"documentId": "doc-b", **write_document(tmp_path, "b.txt", "epsilon zeta eta")}
    documents = {"doc-a": doc_a, "doc-b": doc_b}
    worker, store, _, cache = build_worker(tmp_path, documents)

    await worker._process_job("job-a", "doc-a")
    await worker._process_job("job-b", "doc-b")

    await worker.delete_document_artifacts(doc_a)

    assert store.search([0.0] * 8, top_k=10, filters={"document_id": "doc-a"}) == []
    assert store.search([0.0] * 8, top_k=10, filters={"document_id": "doc-b"})
    assert worker.bm25_index.search("zeta", top_k=10, filters={"workspace_id": "workspace-1"})
    assert worker.bm25_index.search("alpha", top_k=10, filters={"workspace_id": "workspace-1"}) == []
    cache.close()
