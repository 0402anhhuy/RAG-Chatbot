"""Ingest-job coordination backed by the Spring backend.

The queue is durable, but it is no longer local: a job lives in the backend's
``rag_ingest_jobs`` table, and this module only holds the state machine that the
worker drives (reserve -> running -> succeeded/failed, retry, recover).
"""

from __future__ import annotations

from typing import Any, Literal

from app.core.backend_client import BackendNotFound, BackendRegistry
from app.rag.types import IngestJob


class DurableIngestQueue:
    """Thin state machine over the backend's ingest-job table."""

    def __init__(
        self,
        registry: BackendRegistry,
        *,
        worker_timeout_seconds: int = 300,
        max_attempts: int = 3,
        dedup_strategy: Literal["hash", "none"] = "hash",
    ) -> None:
        self.registry = registry
        self.worker_timeout_seconds = worker_timeout_seconds
        self.max_attempts = max_attempts
        self.dedup_strategy = dedup_strategy

    @staticmethod
    def _to_job(record: dict[str, Any]) -> IngestJob:
        return IngestJob(
            id=str(record["jobId"]),
            document_id=record.get("documentId"),
            status=record.get("status", "queued"),
            progress=float(record.get("progress") or 0.0),
            error=record.get("error"),
            total_chunks=int(record.get("totalChunks") or 0),
        )

    def enqueue_document(
        self,
        source_path: str,
        *,
        document_id: str | None = None,
        checksum: str | None = None,
        metadata: dict[str, Any] | None = None,
        deduplicate: bool | None = None,
    ) -> IngestJob:
        # Job IDs come from the caller (document-ingest always has one) or from the
        # backend; checksum deduplication is done on the document catalog before a
        # job is ever created, so no extra job-level dedup key is needed here.
        del deduplicate
        payload: dict[str, Any] = {
            "documentId": document_id,
            "sourcePath": source_path,
            "checksum": checksum,
            "maxAttempts": self.max_attempts,
            "metadata": metadata or {},
        }
        return self._to_job(self.registry.create_job(payload))

    def get_job(self, job_id: str) -> IngestJob | None:
        record = self.registry.get_job(job_id)
        return self._to_job(record) if record is not None else None

    def reserve_next_job(self) -> IngestJob | None:
        record = self.registry.reserve_next_job()
        return self._to_job(record) if record is not None else None

    def mark_succeeded(
        self,
        job_id: str,
        *,
        total_chunks: int = 0,
        progress: float = 1.0,
    ) -> IngestJob | None:
        try:
            record = self.registry.update_job(
                job_id,
                status="succeeded",
                total_chunks=total_chunks,
                progress=progress,
                error=None,
            )
        except BackendNotFound:
            return None
        return self._to_job(record) if record is not None else None

    def mark_failed(self, job_id: str, error: str) -> IngestJob | None:
        """Retry while attempts remain, otherwise mark the job failed."""
        current = self.registry.get_job(job_id)
        if current is None:
            return None
        retryable = int(current.get("attempts") or 0) < int(
            current.get("maxAttempts") or self.max_attempts)
        try:
            record = self.registry.update_job(
                job_id,
                status="queued" if retryable else "failed",
                progress=0.0,
                error=error,
            )
        except BackendNotFound:
            return None
        return self._to_job(record) if record is not None else None

    def delete_job(self, job_id: str) -> IngestJob | None:
        try:
            record = self.registry.update_job(
                job_id, status="deleted", error=None)
        except BackendNotFound:
            return None
        return self._to_job(record) if record is not None else None

    def recover_orphaned_jobs(self) -> list[IngestJob]:
        records = self.registry.recover_jobs(
            stale_after_seconds=self.worker_timeout_seconds,
            max_attempts=self.max_attempts,
        )
        return [self._to_job(record) for record in records]
