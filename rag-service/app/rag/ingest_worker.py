"""Background worker that turns durable ingest jobs into indexed chunks.

Job and document state live in the Spring backend; this worker only parses files,
writes the extracted chunks back, and rebuilds the local BM25/vector indexes.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from app.core.backend_client import BackendNotFound, BackendRegistry
from app.rag.factories.embedding_factory import EmbeddingModel
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
    page_number = record.get("pageNumber")
    return DocumentChunk(
        chunk_id=str(record["chunkId"]),
        document_id=str(record["documentId"]),
        content=str(record["content"]),
        chunk_index=int(record.get("chunkIndex") or 0),
        page_number=int(page_number) if page_number is not None else None,
        section_path=record.get("sectionPath") if isinstance(
            record.get("sectionPath"), str) else None,
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
    ) -> None:
        self.queue = queue
        self.registry = registry
        self.bm25_index = bm25_index
        self.settings = settings
        self.embedding_model = embedding_model
        self.vector_store = vector_store

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
        await self._rebuild_indexes()

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
        try:
            chunks = await asyncio.to_thread(
                build_document_chunks,
                document["sourcePath"],
                document_id=document_id,
                filename=document["fileName"],
                chunk_size=self.settings.retrieval.chunk_size,
                chunk_overlap=self.settings.retrieval.chunk_overlap,
                workspace_id=document.get("workspaceId"),
            )
            await asyncio.to_thread(self.registry.replace_chunks, document_id, chunk_payload(chunks))
            await self._set_status(document_id, "processing", chunk_count=len(chunks))
            await self._rebuild_indexes()
            completed = await asyncio.to_thread(
                self.queue.mark_succeeded, job_id, total_chunks=len(chunks))
            if completed is not None and completed.status == "succeeded":
                await self._set_status(document_id, "ready", chunk_count=len(chunks))
        except BackendNotFound:
            # The document was deleted while it was being indexed: nothing to report.
            await asyncio.to_thread(self.queue.delete_job, job_id)
        except Exception as exc:
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

        def rebuild() -> None:
            vectors = self.embedding_model.embed_documents(
                [chunk.content for chunk in chunks])
            if len(vectors) != len(chunks):
                raise RuntimeError(
                    "Embedding provider returned an unexpected number of vectors")
            self.bm25_index.index_documents(chunks)
            self.vector_store.clear()
            for chunk, vector in zip(chunks, vectors, strict=True):
                metadata = {
                    **chunk.metadata,
                    "document_id": chunk.document_id,
                    "chunk_id": chunk.chunk_id,
                    "content": chunk.content,
                    "page_number": chunk.page_number,
                    "source": chunk.metadata.get("filename", chunk.document_id),
                }
                self.vector_store.upsert(VectorRecord(
                    id=chunk.chunk_id, values=vector, metadata=metadata))

        await asyncio.to_thread(rebuild)

    async def delete_document_artifacts(self, record: dict[str, object]) -> None:
        source_path = record.get("sourcePath")
        if source_path:
            path = Path(str(source_path))
            if path.exists():
                await asyncio.to_thread(path.unlink)
        await self._rebuild_indexes()
