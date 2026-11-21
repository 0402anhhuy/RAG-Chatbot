"""HTTP access to the Spring backend, which owns all RAG relational state.

The RAG service deliberately keeps no database of its own: document metadata,
extracted chunks and ingest-job state live in the backend, and this client is the
single place that knows how to reach those endpoints.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import httpx

from app.core.errors import ApiError, ErrorCode


class BackendUnavailable(RuntimeError):
    """The backend could not be reached or answered with a server error."""


class BackendNotFound(LookupError):
    """The backend answered 404 for the requested resource."""


class BackendRegistry:
    """Thin, typed wrapper over the backend's ``/api/rag`` endpoints."""

    def __init__(
        self,
        base_url: str,
        *,
        api_key: str = "",
        timeout: float = 30.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        headers = {"Accept": "application/json"}
        if api_key:
            headers["X-API-Key"] = api_key
        self.client = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers=headers,
            transport=transport,
        )

    # ------------------------------------------------------------- documents
    def register_document(self, document_id: str, payload: Mapping[str, Any]) -> dict[str, Any]:
        return self._json(
            self.client.put(
                f"/api/rag/documents/{document_id}", json=dict(payload)),
            missing_ok=False,
        )

    def get_document(self, document_id: str) -> dict[str, Any] | None:
        response = self.client.get(f"/api/rag/documents/{document_id}")
        if response.status_code == 404:
            return None
        return self._json(response, missing_ok=False)

    def list_documents(
        self,
        *,
        workspace_id: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, str] = {}
        if workspace_id is not None:
            params["workspaceId"] = workspace_id
        if status is not None:
            params["status"] = status
        return self._list(self.client.get("/api/rag/documents", params=params))

    def find_active_checksum(self, checksum: str, *, workspace_id: str | None) -> dict[str, Any] | None:
        for status in ("ready", "processing", "queued"):
            for document in self.list_documents(workspace_id=workspace_id, status=status):
                if document.get("checksum") == checksum:
                    return document
        return None

    def set_status(
        self,
        document_id: str,
        status: str,
        *,
        chunk_count: int | None = None,
        error: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"status": status, "error": error}
        if chunk_count is not None:
            body["chunkCount"] = chunk_count
        return self._json(
            self.client.patch(
                f"/api/rag/documents/{document_id}/status", json=body),
            missing_ok=False,
        )

    def set_job_id(self, document_id: str, job_id: str) -> None:
        response = self.client.put(
            f"/api/rag/documents/{document_id}/job",
            params={"jobId": job_id},
        )
        if response.status_code == 404:
            raise BackendNotFound(document_id)
        self._check(response)

    def delete_document(self, document_id: str) -> dict[str, Any] | None:
        existing = self.get_document(document_id)
        if existing is None:
            return None
        response = self.client.delete(f"/api/rag/documents/{document_id}")
        if response.status_code == 404:
            return None
        self._check(response)
        return existing

    # ---------------------------------------------------------------- chunks
    def replace_chunks(self, document_id: str, chunks: Sequence[Mapping[str, Any]]) -> int:
        response = self.client.put(
            f"/api/rag/documents/{document_id}/chunks",
            json={"chunks": [dict(chunk) for chunk in chunks]},
        )
        if response.status_code == 404:
            raise BackendNotFound(document_id)
        payload = self._json(response, missing_ok=False)
        return int(payload.get("chunkCount", 0))

    def list_chunks(
        self,
        *,
        document_ids: Sequence[str] | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        params: list[tuple[str, str]] = []
        if limit is not None:
            params.append(("limit", str(limit)))
        if document_ids:
            params.extend(("documentIds", document_id)
                          for document_id in document_ids)
        return self._list(self.client.get("/api/rag/chunks", params=params))

    def count_chunks(self, document_id: str) -> int:
        return len(self._list(self.client.get(f"/api/rag/documents/{document_id}/chunks")))

    # ------------------------------------------------------------ ingest jobs
    def create_job(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        return self._json(self.client.post("/api/rag/ingest/jobs", json=dict(payload)), missing_ok=False)

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        response = self.client.get(f"/api/rag/ingest/jobs/{job_id}")
        if response.status_code == 404:
            return None
        return self._json(response, missing_ok=False)

    def reserve_next_job(self) -> dict[str, Any] | None:
        response = self.client.post("/api/rag/ingest/jobs/next")
        if response.status_code == 204:
            return None
        return self._json(response, missing_ok=False)

    def update_job(
        self,
        job_id: str,
        *,
        status: str,
        total_chunks: int | None = None,
        progress: float | None = None,
        error: str | None = None,
    ) -> dict[str, Any] | None:
        body: dict[str, Any] = {"status": status, "error": error}
        if total_chunks is not None:
            body["totalChunks"] = total_chunks
        if progress is not None:
            body["progress"] = progress
        response = self.client.patch(
            f"/api/rag/ingest/jobs/{job_id}", json=body)
        if response.status_code == 404:
            return None
        return self._json(response, missing_ok=False)

    def recover_jobs(self, *, stale_after_seconds: int, max_attempts: int) -> list[dict[str, Any]]:
        return self._list(
            self.client.post(
                "/api/rag/ingest/jobs/recover",
                params={"staleAfterSeconds": stale_after_seconds,
                        "maxAttempts": max_attempts},
            )
        )

    # ----------------------------------------------------------------- study
    def document_context(
        self,
        workspace_id: str,
        document_ids: Sequence[str] | None,
        *,
        max_chars: int | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"workspaceId": workspace_id}
        if document_ids:
            body["documentIds"] = list(document_ids)
        if max_chars is not None:
            body["maxChars"] = max_chars
        return self._json(self.client.post("/api/rag/document-context", json=body), missing_ok=False)

    # --------------------------------------------------------------- helpers
    def close(self) -> None:
        self.client.close()

    @staticmethod
    def _check(response: httpx.Response) -> None:
        if response.status_code >= 500:
            raise BackendUnavailable(
                f"backend returned {response.status_code}")
        if response.status_code >= 400:
            raise ApiError(
                ErrorCode.INTERNAL_ERROR,
                "backend rejected the RAG state update",
                status_code=502,
                details={"backend_status": response.status_code},
            )

    @classmethod
    def _json(cls, response: httpx.Response, *, missing_ok: bool) -> dict[str, Any]:
        cls._check(response)
        if response.status_code == 404 and not missing_ok:
            raise BackendNotFound(response.request.url.path)
        payload = response.json()
        if not isinstance(payload, dict):
            raise BackendUnavailable("backend returned a non-object response")
        return payload

    @classmethod
    def _list(cls, response: httpx.Response) -> list[dict[str, Any]]:
        cls._check(response)
        payload = response.json()
        if not isinstance(payload, list):
            raise BackendUnavailable("backend returned a non-array response")
        return [item for item in payload if isinstance(item, dict)]
