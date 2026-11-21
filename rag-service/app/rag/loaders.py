"""File loaders used by the retrieval and ingest stages."""

from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from pypdf import PdfReader

SUPPORTED_EXTENSIONS = frozenset({".txt", ".md", ".markdown", ".rst", ".log", ".json", ".csv", ".pdf"})


def load_document_pages(path: str | Path) -> list[tuple[int | None, str]]:
    """Load text from a supported file while preserving PDF page numbers."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(str(file_path))
        if reader.is_encrypted:
            raise ValueError("encrypted PDF files are not supported")
        return [(index + 1, page.extract_text() or "") for index, page in enumerate(reader.pages)]

    if suffix in {".txt", ".md", ".markdown", ".rst", ".log", ".csv"}:
        return [(None, file_path.read_text(encoding="utf-8"))]

    if suffix == ".json":
        with file_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        return [(None, json.dumps(payload, ensure_ascii=False))]

    raise ValueError(f"Unsupported document type: {suffix or file_path.name}")


def load_document_text(path: str | Path) -> str:
    """Read a text-like file and return normalized content."""
    return "\n\n".join(text for _, text in load_document_pages(path))


def load_document_metadata(path: str | Path) -> dict[str, Any]:
    file_path = Path(path)
    return {
        "source_path": str(file_path),
        "filename": file_path.name,
        "suffix": file_path.suffix.lower(),
        "size_bytes": file_path.stat().st_size,
    }


def normalize_page_text(pages: Sequence[tuple[int | None, str]]) -> list[tuple[int | None, str]]:
    """Drop pages with no extractable text without changing remaining page numbers."""
    return [(page_number, text.strip()) for page_number, text in pages if text.strip()]
