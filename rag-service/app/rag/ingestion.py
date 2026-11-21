"""Provider-independent conversion of supported files into stable chunks."""

from __future__ import annotations

from pathlib import Path

from app.rag.hashing import fingerprint_text, make_chunk_id
from app.rag.loaders import load_document_pages, normalize_page_text
from app.rag.splitters import chunk_text
from app.rag.types import DocumentChunk


def build_document_chunks(
    source_path: str | Path,
    *,
    document_id: str,
    filename: str,
    chunk_size: int,
    chunk_overlap: int,
    workspace_id: str | None = None,
) -> list[DocumentChunk]:
    """Parse and split a file while preserving stable identity and source metadata."""
    pages = normalize_page_text(load_document_pages(source_path))
    chunks: list[DocumentChunk] = []
    for page_number, text in pages:
        for chunk in chunk_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap):
            chunk_index = len(chunks)
            metadata: dict[str, object] = {"filename": filename}
            if workspace_id is not None:
                metadata["workspace_id"] = workspace_id
            chunks.append(
                DocumentChunk(
                    chunk_id=make_chunk_id(document_id, chunk_index, chunk),
                    document_id=document_id,
                    content=chunk,
                    chunk_index=chunk_index,
                    page_number=page_number,
                    checksum=fingerprint_text(chunk),
                    metadata=metadata,
                )
            )
    if not chunks:
        raise ValueError("document contains no extractable text")
    return chunks
