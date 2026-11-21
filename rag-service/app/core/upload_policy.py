"""Upload validation helpers for safe file ingestion and failure-mode checks."""

from __future__ import annotations

import os
from pathlib import Path, PurePosixPath

ALLOWED_EXTENSIONS = {".txt", ".md", ".markdown", ".rst", ".log", ".pdf", ".json", ".csv"}


def validate_upload_file(
    filename: str,
    *,
    file_size_bytes: int,
    max_size_bytes: int = 15 * 1024 * 1024,
    allowed_extensions: set[str] | None = None,
) -> None:
    """Validate a file before it is stored or scheduled for ingest.

    This keeps the upload boundary defensive without hard-coding a provider or
    parser implementation. The checks are intentionally small and deterministic so
    they can be exercised in unit tests and in later upload endpoints.
    """
    allowed = allowed_extensions or ALLOWED_EXTENSIONS
    candidate = (filename or "").strip()
    if not candidate:
        raise ValueError("filename is required")
    if file_size_bytes <= 0:
        raise ValueError("file is empty")
    if file_size_bytes > max_size_bytes:
        raise ValueError("file exceeds configured size limit")

    normalized = PurePosixPath(candidate)
    if ".." in normalized.parts or candidate != os.path.basename(candidate):
        raise ValueError("filename contains invalid path traversal characters")

    suffix = Path(candidate).suffix.lower()
    if suffix not in allowed:
        raise ValueError(f"unsupported file extension: {suffix or '<none>'}")
