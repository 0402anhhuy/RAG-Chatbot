"""Provider-independent conversion of supported files into stable chunks."""

from __future__ import annotations

from pathlib import Path

from app.rag.hashing import fingerprint_text, make_chunk_id
from app.rag.loaders import load_document_pages, normalize_page_text
from app.rag.splitters import chunk_text, chunk_text_tokens
from app.rag.tokenization import count_tokens
from app.rag.types import DocumentChunk


def build_document_chunks(
    source_path: str | Path,
    *,
    document_id: str,
    filename: str,
    chunk_size: int,
    chunk_overlap: int,
    workspace_id: str | None = None,
    chunk_unit: str = "chars",
    chunk_size_tokens: int = 320,
    chunk_overlap_tokens: int = 48,
    min_chunk_tokens: int = 24,
    index_version: str = "chunk-v2",
) -> list[DocumentChunk]:
    """Parse and split a file while preserving stable identity and source metadata."""
    pages = normalize_page_text(load_document_pages(source_path))
    chunks: list[DocumentChunk] = []
    use_tokens = chunk_unit == "tokens"
    for page_number, text in pages:
        if use_tokens:
            pieces = chunk_text_tokens(
                text,
                chunk_size_tokens=chunk_size_tokens,
                chunk_overlap_tokens=chunk_overlap_tokens,
                min_chunk_tokens=min_chunk_tokens,
            )
            candidates = [(piece.content, piece.section_path) for piece in pieces]
        else:
            candidates = [(piece, None) for piece in chunk_text(
                text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)]
        for content, section_path in candidates:
            if not content.strip():
                continue
            chunk_index = len(chunks)
            metadata: dict[str, object] = {
                "filename": filename,
                "index_version": index_version,
                "token_count": count_tokens(content) if use_tokens else None,
            }
            if workspace_id is not None:
                metadata["workspace_id"] = workspace_id
            if section_path:
                metadata["section_path"] = section_path
            chunks.append(
                DocumentChunk(
                    chunk_id=make_chunk_id(document_id, chunk_index, content),
                    document_id=document_id,
                    content=content,
                    chunk_index=chunk_index,
                    page_number=page_number,
                    section_path=section_path,
                    checksum=fingerprint_text(content),
                    metadata=metadata,
                )
            )
    if not chunks:
        raise ValueError("document contains no extractable text")
    return chunks
