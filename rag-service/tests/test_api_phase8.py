from __future__ import annotations

import time
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app
from config.settings import (
    AppSettings,
    BM25Settings,
    DatabaseSettings,
    IngestSettings,
    SecuritySettings,
    Settings,
    UploadSettings,
)


def make_settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        app=AppSettings(env="test"),
        security=SecuritySettings(enabled=False),
        database=DatabaseSettings(path=str(tmp_path / "app.db")),
        bm25=BM25Settings(persist_path=str(tmp_path / "bm25.jsonl")),
        ingest=IngestSettings(queue_path=str(tmp_path / "ingest.db")),
        upload=UploadSettings(directory=str(tmp_path / "uploads")),
    )


def test_chat_completions_returns_success_envelope(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/chat/completions",
            json={
                "query": "What is the answer?",
                "workspaceId": "workspace-1",
                "chat_history": [{"role": "user", "content": "Hi"}],
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert "answer" in payload["data"]
    assert "citations" in payload["data"]
    assert payload["request_id"]


def test_chat_stream_emits_sse_events(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/chat/stream",
            json={"query": "Test the stream", "workspaceId": "workspace-1"},
        )

    assert response.status_code == 200
    body = response.text
    assert "event: metadata" in body
    assert "event: token" in body
    assert "event: done" in body


def test_workspace_filtered_retrieval_returns_only_requested_tenant(tmp_path: Path) -> None:
    settings = make_settings(tmp_path)
    app = create_app(settings)

    with TestClient(app) as client:
        uploads = []
        document_ids = []
        for workspace_id, content in (
            ("workspace-a", b"violet policy belongs to workspace a"),
            ("workspace-b", b"violet policy belongs to workspace b"),
        ):
            response = client.post(
                "/api/v1/documents/upload",
                data={"workspaceId": workspace_id},
                files={"file": (f"{workspace_id}.txt", content, "text/plain")},
            )
            uploads.append(response.json()["data"]["job_id"])
            document_ids.append(response.json()["data"]["document_id"])

        for job_id in uploads:
            for _ in range(100):
                job = client.get(f"/api/v1/documents/jobs/{job_id}").json()["data"]
                if job["document_status"] in {"ready", "failed"}:
                    break
                time.sleep(0.01)
            assert job["document_status"] == "ready"

        response = client.post(
            "/api/v1/retrieval/search",
            json={"query": "violet policy", "workspaceId": "workspace-a"},
        )

    assert response.status_code == 200
    assert response.json()["data"]
    assert {hit["document_id"] for hit in response.json()["data"]} == {document_ids[0]}


def test_study_api_returns_local_mock_items_with_source_provenance(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))

    with TestClient(app) as client:
        upload = client.post(
            "/api/v1/documents/upload",
            data={"workspaceId": "workspace-1"},
            files={"file": ("source.txt", b"BM25 ranks documents using term frequency.", "text/plain")},
        )
        document_id = upload.json()["data"]["document_id"]
        job_id = upload.json()["data"]["job_id"]
        for _ in range(100):
            job = client.get(f"/api/v1/documents/jobs/{job_id}").json()["data"]
            if job["document_status"] in {"ready", "failed"}:
                break
            time.sleep(0.01)
        response = client.post(
            "/api/v1/study/flashcards",
            json={
                "workspaceId": "workspace-1",
                "documentId": document_id,
                "maxItems": 5,
            },
        )

    assert response.status_code == 200
    card = response.json()["data"]["flashcards"][0]
    assert card["document_id"] == document_id
    assert card["chunk_id"]
    assert "BM25 ranks documents" in card["answer"]


def test_document_and_chat_routes_require_an_internal_api_key(tmp_path: Path) -> None:
    settings = make_settings(tmp_path)
    settings.security = SecuritySettings(enabled=True, api_key="unit-test-key")
    app = create_app(settings)

    with TestClient(app) as client:
        rejected = client.get("/api/v1/documents")
        accepted = client.get("/api/v1/documents", headers={"X-API-Key": "unit-test-key"})

    assert rejected.status_code == 401
    assert accepted.status_code == 200


def test_document_upload_and_job_status_round_trip(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))

    with TestClient(app) as client:
        upload = client.post(
            "/api/v1/documents/upload",
            files={"file": ("sample.txt", b"hello world", "text/plain")},
        )
        payload = upload.json()
        job_id = payload["data"]["job_id"]

        status = client.get(f"/api/v1/documents/jobs/{job_id}")
        documents = client.get("/api/v1/documents")

    assert upload.status_code == 202
    assert payload["success"] is True
    assert status.status_code == 200
    assert status.json()["data"]["job_id"] == job_id
    assert documents.status_code == 200
    assert documents.json()["data"][0]["file_name"] == "sample.txt"


def test_document_upload_can_wait_for_indexing_and_preserve_document_id(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))
    document_id = "bf544af5-1958-462a-9b80-8c4cc37aa906"
    form = {
        "workspaceId": "workspace-1",
        "documentId": document_id,
        "waitUntilReady": "true",
    }

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/documents/upload",
            data=form,
            files={"file": ("sample.txt", b"stable identity is indexed before returning", "text/plain")},
        )
        retry = client.post(
            "/api/v1/documents/upload",
            data={**form, "waitUntilReady": "false"},
            files={"file": ("sample.txt", b"stable identity is indexed before returning", "text/plain")},
        )

    assert response.status_code == 200
    assert response.json()["data"]["document_id"] == document_id
    assert response.json()["data"]["document_status"] == "ready"
    assert response.json()["data"]["chunk_count"] > 0
    assert retry.status_code == 200
    assert retry.json()["data"]["document_id"] == document_id
    assert retry.json()["data"]["document_status"] == "ready"


def test_document_upload_is_indexed_and_persisted_across_restart(tmp_path: Path) -> None:
    settings = make_settings(tmp_path)
    app = create_app(settings)

    with TestClient(app) as client:
        upload = client.post(
            "/api/v1/documents/upload",
            data={"workspaceId": "workspace-1", "courseCode": "RAG"},
            files={"file": ("sample.txt", b"Durable retrieval stores useful document chunks.", "text/plain")},
        )
        assert upload.status_code == 202
        job_id = upload.json()["data"]["job_id"]

        for _ in range(100):
            job = client.get(f"/api/v1/documents/jobs/{job_id}").json()["data"]
            if job["document_status"] in {"ready", "failed"} and job["status"] in {
                "succeeded",
                "failed",
            }:
                break
            time.sleep(0.01)

        assert job["document_status"] == "ready", job
        assert job["status"] == "succeeded"
        assert job["total_chunks"] > 0
        indexed = client.get("/api/v1/documents", params={"workspaceId": "workspace-1"}).json()["data"]
        assert indexed[0]["status"] == "ready"
        assert indexed[0]["chunk_count"] == job["total_chunks"]

    restarted_app = create_app(settings)
    with TestClient(restarted_app) as client:
        indexed_after_restart = client.get(
            "/api/v1/documents",
            params={"workspaceId": "workspace-1"},
        ).json()["data"]
        assert indexed_after_restart[0]["document_id"] == indexed[0]["document_id"]
        assert restarted_app.state.bm25_index.search("durable retrieval", top_k=1)


def test_document_upload_rejects_unsupported_file_type(tmp_path: Path) -> None:
    app = create_app(make_settings(tmp_path))

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("malware.exe", b"not supported", "application/octet-stream")},
        )

    assert response.status_code == 422


def test_document_upload_rejects_files_over_configured_limit(tmp_path: Path) -> None:
    settings = make_settings(tmp_path)
    settings.upload.max_size_bytes = 4
    app = create_app(settings)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("sample.txt", b"five!", "text/plain")},
        )

    assert response.status_code == 422


def test_document_delete_removes_source_chunks_and_bm25_entries(tmp_path: Path) -> None:
    settings = make_settings(tmp_path)
    app = create_app(settings)

    with TestClient(app) as client:
        upload = client.post(
            "/api/v1/documents/upload",
            files={"file": ("sample.txt", b"Needleword survives indexing until deletion.", "text/plain")},
        )
        document_id = upload.json()["data"]["document_id"]
        job_id = upload.json()["data"]["job_id"]
        source_path = Path(settings.upload.directory) / f"{document_id}-sample.txt"

        for _ in range(100):
            job = client.get(f"/api/v1/documents/jobs/{job_id}").json()["data"]
            if job["document_status"] == "ready" and job["status"] == "succeeded":
                break
            time.sleep(0.01)

        assert source_path.exists()
        assert app.state.bm25_index.search("needleword", top_k=1)
        assert client.delete(f"/api/v1/documents/{document_id}").status_code == 204
        assert client.get("/api/v1/documents").json()["data"] == []
        assert app.state.bm25_index.search("needleword", top_k=1) == []
        assert not source_path.exists()
