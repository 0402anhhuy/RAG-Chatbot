"""Utilities for turning text into retrieval chunks with overlap."""

from __future__ import annotations


def chunk_text(
    text: str,
    *,
    chunk_size: int = 600,
    chunk_overlap: int = 100,
    separators: list[str] | None = None,
) -> list[str]:
    """Chunk text into variable-size windows with overlapping boundaries."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if chunk_overlap < 0:
        raise ValueError("chunk_overlap must be non-negative")
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    normalized = text.strip()
    if not normalized:
        return []

    chunks: list[str] = []
    selected = [separator for separator in (separators or ["\n\n", "\n", ". ", " "]) if separator]
    start = 0
    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        if end < len(normalized):
            boundary = -1
            for separator in selected:
                position = normalized.rfind(separator, start + chunk_size // 2, end)
                if position >= 0:
                    boundary = max(boundary, position + len(separator))
            if boundary > start:
                end = boundary

        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(normalized):
            break

        next_start = max(start + 1, end - chunk_overlap)
        while next_start < end and normalized[next_start].isspace():
            next_start += 1
        start = next_start
    return chunks
