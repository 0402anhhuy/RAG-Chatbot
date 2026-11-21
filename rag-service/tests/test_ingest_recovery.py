from __future__ import annotations

import sqlite3

from app.rag.ingest_service import DurableIngestQueue


def test_ingest_queue_deduplicates_same_checksum(tmp_path) -> None:
    queue = DurableIngestQueue(tmp_path / "ingest.db", worker_timeout_seconds=60, max_attempts=2)

    first = queue.enqueue_document("/tmp/a.txt", document_id="doc-1", checksum="hash-123", metadata={"title": "Alpha"})
    second = queue.enqueue_document("/tmp/b.txt", document_id="doc-2", checksum="hash-123", metadata={"title": "Alpha"})

    assert first.id == second.id
    assert queue.list_jobs(status="queued")[0].id == first.id


def test_ingest_queue_retries_and_recovers_stale_running_jobs(tmp_path) -> None:
    queue = DurableIngestQueue(tmp_path / "ingest.db", worker_timeout_seconds=30, max_attempts=2)
    job = queue.enqueue_document("/tmp/c.txt", checksum="hash-456", metadata={"title": "Bravo"})

    with sqlite3.connect(queue.db_path) as connection:
        connection.execute(
            "UPDATE ingest_jobs SET status = 'running', updated_at = '2000-01-01T00:00:00Z' WHERE id = ?",
            (job.id,),
        )

    recovered = queue.recover_orphaned_jobs()
    assert recovered[0].status == "queued"
    assert recovered[0].id == job.id

    reserved = queue.reserve_next_job()
    assert reserved is not None
    assert reserved.id == job.id

    queue.mark_succeeded(reserved.id, total_chunks=8)
    final = queue.get_job(reserved.id)
    assert final is not None
    assert final.status == "succeeded"
    assert final.total_chunks == 8


def test_ingest_queue_marks_failed_jobs_and_tracks_delete_semantics(tmp_path) -> None:
    queue = DurableIngestQueue(tmp_path / "ingest.db", worker_timeout_seconds=30, max_attempts=2)
    job = queue.enqueue_document("/tmp/d.txt", checksum="hash-789")

    reserved = queue.reserve_next_job()
    assert reserved is not None
    assert reserved.id == job.id

    failed = queue.mark_failed(reserved.id, "worker exception")
    assert failed is not None
    assert failed.status == "queued"
    assert failed.error == "worker exception"

    deleted = queue.delete_job(job.id)
    assert deleted is not None
    assert deleted.status == "deleted"
