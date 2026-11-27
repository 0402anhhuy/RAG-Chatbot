"""Document upload and job-management endpoints.

The catalog (documents, chunks, jobs) lives in the Spring backend; this module
writes files to the local upload store and asks the backend to persist the
records through :class:`BackendRegistry`.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import uuid
from collections.abc import Callable
from pathlib import Path
from time import monotonic
from typing import Annotated, Any, TypeVar

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import JSONResponse, Response

from app.core.backend_client import BackendNotFound, BackendRegistry, BackendUnavailable
from app.core.context import request_id_context
from app.core.errors import ApiError, ErrorCode
from app.core.principal import Principal, ensure_workspace_allowed, get_principal
from app.core.security import require_api_key
from app.core.upload_policy import validate_upload_file
from app.rag.ingest_service import DurableIngestQueue
from app.rag.ingest_worker import DocumentIngestWorker
from app.rag.loaders import SUPPORTED_EXTENSIONS

router = APIRouter(tags=["documents"], dependencies=[Depends(require_api_key)])


def _registry(request: Request) -> BackendRegistry:
    registry = getattr(request.app.state, "backend", None)
    if not isinstance(registry, BackendRegistry):
        raise RuntimeError("backend registry is not initialized")
    return registry


def _queue(request: Request) -> DurableIngestQueue:
    queue = getattr(request.app.state, "ingest_queue", None)
    if not isinstance(queue, DurableIngestQueue):
        raise RuntimeError("ingest queue is not initialized")
    return queue


def _worker(request: Request) -> DocumentIngestWorker:
    worker = getattr(request.app.state, "ingest_worker", None)
    if not isinstance(worker, DocumentIngestWorker):
        raise RuntimeError("ingest worker is not initialized")
    return worker


def _ensure_scope(principal: Principal, workspace_id: str | None) -> None:
    if workspace_id is None:
        if not principal.unrestricted:
            raise ApiError(
                ErrorCode.FORBIDDEN,
                "Workspace scope is required for this principal",
                status_code=403,
            )
        return
    ensure_workspace_allowed(principal, workspace_id)


@router.post("/documents/upload")
async def upload_document(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    principal: Annotated[Principal, Depends(get_principal)],
    dedup_strategy: Annotated[str | None, Form()] = None,
    workspace_id: Annotated[str | None, Form(alias="workspaceId")] = None,
    course_code: Annotated[str | None, Form(alias="courseCode")] = None,
    document_id: Annotated[str | None, Form(alias="documentId")] = None,
    wait_until_ready: Annotated[bool, Form(alias="waitUntilReady")] = False,
) -> JSONResponse:
    _ensure_scope(principal, workspace_id)
    if file.filename is None or not file.filename.strip():
        raise ApiError(ErrorCode.VALIDATION_ERROR,
                       "file name is required", status_code=422)

    settings = request.app.state.settings
    strategy = dedup_strategy or settings.ingest.dedup_strategy
    if strategy not in {"hash", "none"}:
        raise ApiError(ErrorCode.VALIDATION_ERROR,
                       "dedup_strategy must be 'hash' or 'none'", status_code=422)
    try:
        payload = await file.read(settings.upload.max_size_bytes + 1)
        validate_upload_file(
            file.filename,
            file_size_bytes=len(payload),
            max_size_bytes=settings.upload.max_size_bytes,
            allowed_extensions=set(SUPPORTED_EXTENSIONS),
        )
    except ValueError as exc:
        raise ApiError(ErrorCode.VALIDATION_ERROR,
                       str(exc), status_code=422) from exc
    finally:
        await file.close()

    checksum = hashlib.sha256(payload).hexdigest()
    registry = _registry(request)
    has_explicit_document_id = document_id is not None
    if document_id is not None:
        try:
            uuid.UUID(document_id)
        except ValueError as exc:
            raise ApiError(ErrorCode.VALIDATION_ERROR,
                           "documentId must be a UUID", status_code=422) from exc
        existing = await _backend(request, registry.get_document, document_id)
        if existing is not None:
            if existing.get("workspaceId") != workspace_id or existing.get("checksum") != checksum:
                raise ApiError(ErrorCode.VALIDATION_ERROR,
                               "documentId is already in use", status_code=409)
            job_id = existing.get("jobId")
            if wait_until_ready and existing["documentStatus"] != "ready" and job_id:
                return await _wait_until_ready(request, document_id, str(job_id))
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "data": {
                        "status": "already_exists",
                        "document_id": document_id,
                        "job_id": job_id,
                        "document_status": existing["documentStatus"],
                        "chunk_count": existing["chunkCount"],
                    },
                    "request_id": request_id_context.get(),
                },
            )
    if strategy == "hash" and document_id is None:
        duplicate = await _backend(
            request, registry.find_active_checksum, checksum, workspace_id=workspace_id)
        if duplicate is not None:
            if wait_until_ready and duplicate.get("jobId"):
                return await _wait_until_ready(request, str(duplicate["documentId"]), str(duplicate["jobId"]))
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "data": {
                        "status": "already_exists",
                        "document_id": duplicate["documentId"],
                        "job_id": duplicate.get("jobId"),
                    },
                    "request_id": request_id_context.get(),
                },
            )

    safe_name = os.path.basename(file.filename)
    document_id = document_id or str(uuid.uuid4())
    upload_root = Path(settings.upload.directory).expanduser()
    upload_root.mkdir(parents=True, exist_ok=True)
    source_path = upload_root / f"{document_id}-{safe_name}"
    try:
        source_path.write_bytes(payload)
        await _backend(
            request,
            registry.register_document,
            document_id,
            {
                "workspaceId": workspace_id,
                "courseCode": course_code,
                "filename": safe_name,
                "sourcePath": str(source_path),
                "checksum": checksum,
                "metadata": {"content_type": file.content_type},
            },
        )
        job = await asyncio.to_thread(
            _queue(request).enqueue_document,
            str(source_path),
            document_id=document_id,
            checksum=checksum,
            metadata={"workspace_id": workspace_id,
                      "course_code": course_code},
            deduplicate=not has_explicit_document_id,
        )
        await _backend(request, registry.set_job_id, document_id, job.id)
    except Exception:
        source_path.unlink(missing_ok=True)
        await _backend(request, registry.delete_document, document_id)
        raise

    if wait_until_ready:
        return await _wait_until_ready(request, document_id, job.id)

    return JSONResponse(
        status_code=202,
        content={
            "success": True,
            "data": {
                "job_id": job.id,
                "document_id": document_id,
                "status": "queued",
            },
            "request_id": request_id_context.get(),
        },
    )


async def _wait_until_ready(request: Request, document_id: str, job_id: str) -> JSONResponse:
    deadline = monotonic() + request.app.state.settings.ingest.worker_timeout_seconds
    registry = _registry(request)
    while monotonic() < deadline:
        job = await asyncio.to_thread(_queue(request).get_job, job_id)
        document = await _backend(request, registry.get_document, document_id)
        if job is None or document is None:
            raise ApiError(ErrorCode.NOT_FOUND,
                           "Document ingest job was not found", status_code=404)
        if job.status == "failed":
            raise ApiError(ErrorCode.INTERNAL_ERROR,
                           "Document indexing failed", status_code=502)
        if job.status == "succeeded" and document["documentStatus"] == "ready":
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "data": {
                        "job_id": job.id,
                        "document_id": document_id,
                        "status": "ready",
                        "document_status": "ready",
                        "chunk_count": document["chunkCount"],
                    },
                    "request_id": request_id_context.get(),
                },
            )
        await asyncio.sleep(0.1)
    raise ApiError(ErrorCode.INTERNAL_ERROR,
                   "Document indexing timed out", status_code=504)


@router.get("/documents")
async def list_documents(
    request: Request,
    principal: Annotated[Principal, Depends(get_principal)],
    workspace_id: Annotated[str | None, Query(alias="workspaceId")] = None,
) -> JSONResponse:
    _ensure_scope(principal, workspace_id)
    documents = await _backend(
        request, _registry(request).list_documents, workspace_id=workspace_id)
    result = [
        {
            "document_id": document["documentId"],
            "file_name": document["fileName"],
            "status": document["documentStatus"],
            "checksum": document["checksum"],
            "chunk_count": document["chunkCount"],
            "job_id": document.get("jobId"),
            "workspace_id": document.get("workspaceId"),
            "created_at": document.get("createdAt"),
            "updated_at": document.get("updatedAt"),
        }
        for document in documents
    ]
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": result,
            "request_id": request_id_context.get(),
        },
    )


@router.get("/documents/jobs/{job_id}")
async def get_job(
    request: Request,
    job_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
) -> JSONResponse:
    job = await asyncio.to_thread(_queue(request).get_job, job_id)
    if job is None:
        raise ApiError(ErrorCode.NOT_FOUND,
                       f"Job {job_id} was not found", status_code=404)
    document = (
        await _backend(request, _registry(request).get_document, job.document_id)
        if job.document_id
        else None
    )
    if document is not None:
        _ensure_scope(principal, str(document.get("workspaceId") or ""))
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": {
                "job_id": job.id,
                "document_id": job.document_id,
                "status": job.status,
                "progress": job.progress,
                "total_chunks": job.total_chunks,
                "error": job.error,
                "created_at": job.created_at.isoformat(),
                "updated_at": job.updated_at.isoformat(),
                "document_status": document["documentStatus"] if document is not None else "deleted",
            },
            "request_id": request_id_context.get(),
        },
    )


@router.delete("/documents/{document_id}")
async def delete_document(
    request: Request,
    document_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
) -> Response:
    registry = _registry(request)
    document = await _backend(request, registry.get_document, document_id)
    if document is None:
        return Response(status_code=204)
    _ensure_scope(principal, str(document.get("workspaceId") or ""))

    await _backend(request, registry.delete_document, document_id)
    if document.get("jobId"):
        await asyncio.to_thread(_queue(request).delete_job, str(document["jobId"]))
    await _worker(request).delete_document_artifacts(document)
    return Response(status_code=204)


T = TypeVar("T")


async def _backend(request: Request, call: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """Run a blocking backend call in a worker thread and map transport errors."""
    try:
        return await asyncio.to_thread(call, *args, **kwargs)
    except BackendNotFound as exc:
        raise ApiError(ErrorCode.NOT_FOUND,
                       "RAG document was not found", status_code=404) from exc
    except BackendUnavailable as exc:
        raise ApiError(
            ErrorCode.INTERNAL_ERROR,
            "RAG state backend is unavailable",
            status_code=503,
        ) from exc
