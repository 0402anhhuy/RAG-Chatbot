"""Deterministic document and chunk identity helpers."""

from __future__ import annotations

import hashlib
from pathlib import Path


def fingerprint_text(value: str) -> str:
    """Return a stable SHA-256 hex digest for plain text content."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def file_fingerprint(path: str | Path) -> str:
    """Return a SHA-256 digest for a file's content."""
    file_path = Path(path)
    digest = hashlib.sha256()
    with file_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def make_chunk_id(document_id: str, chunk_index: int, content: str) -> str:
    """Create a deterministic, provider-agnostic chunk identity."""
    payload = f"{document_id}:{chunk_index}:{content.strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]
