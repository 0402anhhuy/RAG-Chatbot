"""Background worker that turns durable ingest jobs into indexed chunks.

Job and document state live in the Spring backend; this worker only parses files,
writes the extracted chunks back, and keeps the local BM25/vector indexes in sync.
Indexing is incremental per document: only the document being ingested is removed
and re-added, so an upload no longer re-embeds the whole corpus.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Sequence
from pathlib import Path

from app.core.backend_client import BackendNotFound, BackendRegistry
from app.core.metrics import METRICS
from app.rag.embedding_cache import EmbeddingCache
from app.rag.factories.embedding_factory import EmbeddingModel
from app.rag.hashing import fingerprint_text
from app.rag.ingest_service import DurableIngestQueue
from app.rag.ingestion import build_document_chunks
from app.rag.retrievers.bm25 import BM25Index
from app.rag.stores.base import VectorStorePort
from app.rag.types import DocumentChunk, VectorRecord
from config.settings import Settings

logger = logging.getLogger(__name__)


def chunk_payload(chunks: list[DocumentChunk]) -> list[dict[str, object]]:
    """Serialize chunks for the backend's chunk-replacement endpoint."""
    return [
        {
            "chunkId": chunk.chunk_id,
            "chunkIndex": chunk.chunk_index,
            "content": chunk.content,
            "pageNumber": chunk.page_number,
            "sectionPath": chunk.section_path,
            "checksum": chunk.checksum,
            "metadata": chunk.metadata,
        }
        for chunk in chunks
    ]


def chunk_from_record(record: dict[str, object]) -> DocumentChunk:
    """Rebuild a chunk from the backend's chunk representation."""
    metadata = record.get("metadata")
    normalized = dict(metadata) if isinstance(metadata, dict) else {}
    if record.get("fileName") is not None:
        normalized.setdefault("filename", record["fileName"])
    if record.get("workspaceId") is not None:
        normalized.setdefault("workspace_id", record["workspaceId"])
    page_number_raw = record.get("pageNumber")
    page_number = int(page_number_raw) if isinstance(page_number_raw, (int, str)) else None
    chunk_index_raw = record.get("chunkIndex")
    chunk_index = int(chunk_index_raw) if isinstance(chunk_index_raw, (int, str)) else 0
    section_raw = record.get("sectionPath")
    return DocumentChunk(
        chunk_id=str(record["chunkId"]),
        document_id=str(record["documentId"]),
        content=str(record["content"]),
        chunk_index=chunk_index,
        page_number=page_number,
        section_path=section_raw if isinstance(section_raw, str) else None,
        checksum=str(record.get("checksum") or ""),
        metadata=normalized,
    )


class DocumentIngestWorker:
    def __init__(
        self,
        queue: DurableIngestQueue,
        registry: BackendRegistry,
        bm25_index: BM25Index,
        settings: Settings,
        embedding_model: EmbeddingModel,
        vector_store: VectorStorePort,
        embedding_cache: EmbeddingCache | None = None,
    ) -> None:
        self.queue = queue
        self.registry = registry
        self.bm25_index = bm25_index
        self.settings = settings
        self.embedding_model = embedding_model
        self.vector_store = vector_store
        self.embedding_cache = embedding_cache

    # -------------------------------------------------------------- lifecycle
    async def prepare(self) -> None:
        await asyncio.to_thread(self.queue.recover_orphaned_jobs)
        for document in await asyncio.to_thread(self.registry.list_documents, status="processing"):
            document_id = str(document["documentId"])
            job_id = document.get("jobId")
            if not job_id:
                continue
            job = await asyncio.to_thread(self.queue.get_job, str(job_id))
            if job is None:
                await self._set_status(document_id, "failed", error="ingest job was not found")
            elif job.status == "succeeded":
                chunk_count = await asyncio.to_thread(self.registry.count_chunks, document_id)
                await self._set_status(document_id, "ready", chunk_count=chunk_count)
            elif job.status == "failed":
                await self._set_status(document_id, "failed", error=job.error)

        if self.settings.bm25.rebuild_on_boot:
            await self._rebuild_indexes()
        else:
            # Persistent stores (Qdrant/FAISS) already hold the corpus; reload the
            # BM25 snapshot instead of re-embedding everything at boot. An
            # in-memory vector store would start empty in this mode.
            await asyncio.to_thread(self.bm25_index.load)
            logger.info("indexes_loaded_without_rebuild")
            if self.bm25_index.version != self.settings.retrieval.index_version:
                logger.warning(
                    "index_version_mismatch_rebuild",
                    extra={"extra_fields": {
                        "loaded": self.bm25_index.version,
                        "expected": self.settings.retrieval.index_version,
                    }},
                )
                await self._rebuild_indexes()
            elif self.settings.vector_store.backend == "in_memory":
                logger.warning("bm25_loaded_without_rebuild_but_vector_store_is_in_memory")

    async def run(self, stop_event: asyncio.Event) -> None:
        poll_interval = self.settings.ingest.poll_interval_seconds
        while not stop_event.is_set():
            job = await asyncio.to_thread(self.queue.reserve_next_job)
            if job is None:
                try:
                    await asyncio.wait_for(stop_event.wait(), timeout=poll_interval)
                except TimeoutError:
                    continue
                break
            await self._process_job(job.id, job.document_id)

    async def _process_job(self, job_id: str, document_id: str | None) -> None:
        if document_id is None:
            await asyncio.to_thread(self.queue.mark_failed, job_id, "ingest job has no document id")
            return
        document = await asyncio.to_thread(self.registry.get_document, document_id)
        if document is None:
            await asyncio.to_thread(self.queue.mark_failed, job_id, "document record was not found")
            return

        await self._set_status(document_id, "processing")
        started = time.perf_counter()
        try:
            chunks = await asyncio.to_thread(
                build_document_chunks,
                document["sourcePath"],
                document_id=document_id,
                filename=document["fileName"],
                chunk_size=self.settings.retrieval.chunk_size,
                chunk_overlap=self.settings.retrieval.chunk_overlap,
                workspace_id=document.get("workspaceId"),
                chunk_unit=self.settings.retrieval.chunk_unit,
                chunk_size_tokens=self.settings.retrieval.chunk_size_tokens,
                chunk_overlap_tokens=self.settings.retrieval.chunk_overlap_tokens,
                min_chunk_tokens=self.settings.retrieval.min_chunk_tokens,
                index_version=self.settings.retrieval.index_version,
            )
            await asyncio.to_thread(self.registry.replace_chunks, document_id, chunk_payload(chunks))
            await self._set_status(document_id, "processing", chunk_count=len(chunks))
            vectors = await asyncio.to_thread(self._embed_chunks, chunks)
            await asyncio.to_thread(self._index_document, document_id, chunks, vectors)
            completed = await asyncio.to_thread(
                self.queue.mark_succeeded, job_id, total_chunks=len(chunks))
            if completed is not None and completed.status == "succeeded":
                await self._set_status(document_id, "ready", chunk_count=len(chunks))
            METRICS.inc("rag_ingest_jobs_total", labels={"status": "succeeded"})
            METRICS.observe("rag_ingest_job_duration_seconds", time.perf_counter() - started)
            METRICS.observe("rag_ingest_chunks", len(chunks))
        except BackendNotFound:
            # The document was deleted while it was being indexed: nothing to report.
            METRICS.inc("rag_ingest_jobs_total", labels={"status": "deleted"})
            await asyncio.to_thread(self.queue.delete_job, job_id)
        except Exception as exc:
            METRICS.inc("rag_ingest_jobs_total", labels={"status": "failed"})
            METRICS.observe("rag_ingest_job_duration_seconds", time.perf_counter() - started)
            failed = await asyncio.to_thread(self.queue.mark_failed, job_id, str(exc))
            status = failed.status if failed is not None else "failed"
            document_status = "queued" if status == "queued" else "failed"
            try:
                await self._set_status(document_id, document_status, error=str(exc))
            except BackendNotFound:
                return
            if document_status == "failed":
                logger.exception(
                    "document_ingest_failed",
                    extra={"extra_fields": {
                        "document_id": document_id, "job_id": job_id}},
                )

    async def _set_status(
        self,
        document_id: str,
        status: str,
        *,
        chunk_count: int | None = None,
        error: str | None = None,
    ) -> None:
        await asyncio.to_thread(
            self.registry.set_status,
            document_id,
            status,
            chunk_count=chunk_count,
            error=error,
        )

    # ------------------------------------------------------------------ index
    @staticmethod
    def _chunk_key(chunk: DocumentChunk) -> str:
        return chunk.checksum or fingerprint_text(chunk.content)

    def _embed_chunks(self, chunks: Sequence[DocumentChunk]) -> list[list[float]]:
        """Embed chunks through the cache, batching only the cache misses."""
        keys = [self._chunk_key(chunk) for chunk in chunks]
        cached = self.embedding_cache.get_many(keys) if self.embedding_cache is not None else {}
        pending: dict[str, str] = {}
        for chunk, key in zip(chunks, keys, strict=True):
            if key not in cached and key not in pending:
                pending[key] = chunk.content

        resolved = dict(cached)
        batch_size = max(1, self.settings.ingest.chunk_batch_size)
        pending_items = list(pending.items())
        for start in range(0, len(pending_items), batch_size):
            batch = pending_items[start : start + batch_size]
            vectors = self.embedding_model.embed_documents([text for _, text in batch])
            if len(vectors) != len(batch):
                raise RuntimeError("Embedding provider returned an unexpected number of vectors")
            new_entries: list[tuple[str, Sequence[float]]] = []
            for (key, _), vector in zip(batch, vectors, strict=True):
                resolved[key] = list(vector)
                new_entries.append((key, vector))
            if self.embedding_cache is not None:
                self.embedding_cache.put_many(new_entries)

        used = [resolved[key] for key in keys]
        self._validate_dimensions(used)
        return used

    def _validate_dimensions(self, vectors: Sequence[Sequence[float]]) -> None:
        dimensions = {len(vector) for vector in vectors}
        if len(dimensions) > 1:
            raise RuntimeError(f"Embedding provider returned mixed dimensions: {sorted(dimensions)}")
        expected = self.settings.vector_store.vector_size
        if expected is not None and dimensions != {expected}:
            raise RuntimeError(
                f"Embeddings have {sorted(dimensions)} dimensions but vector_store.vector_size is {expected}"
            )

    @staticmethod
    def _vector_metadata(chunk: DocumentChunk) -> dict[str, object]:
        return {
            **chunk.metadata,
            "document_id": chunk.document_id,
            "chunk_id": chunk.chunk_id,
            "content": chunk.content,
            "page_number": chunk.page_number,
            "section_path": chunk.section_path,
            "source": chunk.metadata.get("filename", chunk.document_id),
            "index_version": chunk.metadata.get("index_version"),
        }

    def _index_document(
        self,
        document_id: str,
        chunks: Sequence[DocumentChunk],
        vectors: Sequence[Sequence[float]],
    ) -> None:
        """Replace one document's entries without touching the rest of the corpus."""
        self.bm25_index.replace_document(document_id, list(chunks))
        self.vector_store.delete_by_document(document_id)
        self.vector_store.upsert_many(
            [
                VectorRecord(id=chunk.chunk_id, values=list(vector), metadata=self._vector_metadata(chunk))
                for chunk, vector in zip(chunks, vectors, strict=True)
            ]
        )

    def _delete_document_index(self, document_id: str) -> None:
        self.bm25_index.delete_by_document(document_id)
        self.vector_store.delete_by_document(document_id)

    async def rebuild_indexes(self) -> None:
        """Rebuild the sparse and dense indexes from persisted, indexable chunks."""
        await self._rebuild_indexes()

    async def _rebuild_indexes(self) -> None:
        records = await asyncio.to_thread(self.registry.list_chunks)
        chunks = [chunk_from_record(record) for record in records]
        if not chunks:
            self.bm25_index.index_documents([])
            self.vector_store.clear()
            return

        vectors = await asyncio.to_thread(self._embed_chunks, chunks)
        await asyncio.to_thread(self._replace_all_indexes, chunks, vectors)

    def _replace_all_indexes(
        self,
        chunks: Sequence[DocumentChunk],
        vectors: Sequence[Sequence[float]],
    ) -> None:
        self.bm25_index.index_documents(list(chunks))
        self.vector_store.clear()
        self.vector_store.upsert_many(
            [
                VectorRecord(id=chunk.chunk_id, values=list(vector), metadata=self._vector_metadata(chunk))
                for chunk, vector in zip(chunks, vectors, strict=True)
            ]
        )

    async def delete_document_artifacts(self, record: dict[str, object]) -> None:
        source_path = record.get("sourcePath")
        if source_path:
            path = Path(str(source_path))
            if path.exists():
                await asyncio.to_thread(path.unlink)
        document_id = record.get("documentId") or record.get("document_id")
        if document_id:
            await asyncio.to_thread(self._delete_document_index, str(document_id))
        else:
            await self._rebuild_indexes()
