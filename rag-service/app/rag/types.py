"""Core domain types for documents, chunks, jobs, and vector retrieval."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal


@dataclass(slots=True)
class DocumentRecord:
    id: str
    filename: str
    source_path: str | None = None
    mime_type: str | None = None
    checksum: str | None = None
    status: Literal["queued", "processing", "ready", "failed", "deleted"] = "queued"
    version: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def touch(self) -> None:
        self.updated_at = datetime.now(UTC)


@dataclass(slots=True)
class DocumentChunk:
    chunk_id: str
    document_id: str
    content: str
    chunk_index: int
    page_number: int | None = None
    section_path: str | None = None
    checksum: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(slots=True)
class VectorRecord:
    id: str
    values: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class SearchResult:
    document_id: str
    chunk_id: str
    content: str
    score: float
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class IngestJob:
    id: str
    document_id: str | None
    status: Literal["queued", "running", "succeeded", "failed", "deleted"] = "queued"
    progress: float = 0.0
    error: str | None = None
    total_chunks: int = 0
    source_path: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def touch(self) -> None:
        self.updated_at = datetime.now(UTC)


@dataclass(slots=True)
class Citation:
    document_id: str
    chunk_id: str
    score: float = 0.0
    snippet: str = ""
    source: str | None = None
    page_number: int | None = None


@dataclass(slots=True)
class RAGState:
    question: str
    rewritten_query: str = ""
    conversation_history: list[str] = field(default_factory=list)
    retrieval_results: list[SearchResult] = field(default_factory=list)
    reranked_results: list[SearchResult] = field(default_factory=list)
    relevant_results: list[SearchResult] = field(default_factory=list)
    answer: str = ""
    fallback_answer: str = ""
    citations: list[Citation] = field(default_factory=list)
    retries: int = 0
    max_retries: int = 2
    status: Literal["ready", "retrying", "generated", "fallback", "error"] = "ready"
    error: str | None = None
    context: str = ""
