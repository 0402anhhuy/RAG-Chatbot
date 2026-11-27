"""Utilities for turning text into retrieval chunks with overlap."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.rag.tokenization import HeuristicTokenCounter, TokenCounter

_HEADING = re.compile(r"^(#{1,6})\s+(.+)$")
_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?;:])\s+|\n+")


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


@dataclass(frozen=True, slots=True)
class TextChunk:
    content: str
    section_path: str | None = None


def _split_oversized(block: str, *, counter: TokenCounter, limit: int) -> list[str]:
    """Split a paragraph/sentence that alone exceeds the token budget."""
    if counter.count(block) <= limit:
        return [block]
    sentences = [part.strip() for part in _SENTENCE_BOUNDARY.split(block) if part.strip()]
    pieces: list[str] = []
    for sentence in sentences:
        if counter.count(sentence) <= limit:
            pieces.append(sentence)
            continue
        words = sentence.split()
        current: list[str] = []
        for word in words:
            candidate = " ".join([*current, word])
            if current and counter.count(candidate) > limit:
                pieces.append(" ".join(current))
                current = [word]
            else:
                current.append(word)
        if current:
            pieces.append(" ".join(current))
    return pieces or [block]


def _tail_overlap(text: str, *, counter: TokenCounter, overlap_tokens: int) -> str:
    if overlap_tokens <= 0:
        return ""
    words = text.split()
    tail: list[str] = []
    for word in reversed(words):
        candidate = " ".join([word, *tail])
        if tail and counter.count(candidate) > overlap_tokens:
            break
        tail.insert(0, word)
    return " ".join(tail)


def _section_blocks(text: str) -> list[tuple[str | None, list[str]]]:
    """Split markdown into heading-scoped paragraph blocks."""
    sections: list[tuple[str | None, list[str]]] = []
    headings: list[str] = []
    buffer: list[str] = []
    section_path: str | None = None

    def flush() -> None:
        nonlocal buffer
        block = "\n".join(buffer).strip()
        if block:
            sections.append((section_path, [block]))
        buffer = []

    for raw_line in text.replace("\r\n", "\n").split("\n"):
        line = raw_line.rstrip()
        heading = _HEADING.match(line.strip())
        if heading:
            flush()
            level = len(heading.group(1))
            headings = headings[: level - 1]
            headings.append(heading.group(2).strip())
            section_path = " > ".join(headings)
            continue
        if not line.strip():
            flush()
            continue
        buffer.append(line)
    flush()

    # Merge consecutive blocks that share the same section path for fewer items.
    merged: list[tuple[str | None, list[str]]] = []
    for path, blocks in sections:
        if merged and merged[-1][0] == path:
            merged[-1][1].extend(blocks)
        else:
            merged.append((path, list(blocks)))
    return merged


def chunk_text_tokens(
    text: str,
    *,
    chunk_size_tokens: int = 320,
    chunk_overlap_tokens: int = 48,
    min_chunk_tokens: int = 24,
    counter: TokenCounter | None = None,
) -> list[TextChunk]:
    """Heading-aware token-budgeted chunking with overlap."""
    if chunk_size_tokens <= 0:
        raise ValueError("chunk_size_tokens must be positive")
    if chunk_overlap_tokens < 0:
        raise ValueError("chunk_overlap_tokens must be non-negative")
    if chunk_overlap_tokens >= chunk_size_tokens:
        raise ValueError("chunk_overlap_tokens must be smaller than chunk_size_tokens")
    if min_chunk_tokens < 0:
        raise ValueError("min_chunk_tokens must be non-negative")

    token_counter = counter or HeuristicTokenCounter()
    normalized = text.strip()
    if not normalized:
        return []

    chunks: list[TextChunk] = []
    for section_path, blocks in _section_blocks(normalized):
        current: list[str] = []
        current_tokens = 0

        def flush(path: str | None = section_path) -> None:
            nonlocal current, current_tokens
            content = "\n\n".join(current).strip()
            if content:
                chunks.append(TextChunk(content=content, section_path=path))
            current = []
            current_tokens = 0

        for block in blocks:
            for piece in _split_oversized(block, counter=token_counter, limit=chunk_size_tokens):
                piece_tokens = token_counter.count(piece)
                if current and current_tokens + piece_tokens > chunk_size_tokens:
                    overlap_text = _tail_overlap(
                        "\n\n".join(current),
                        counter=token_counter,
                        overlap_tokens=chunk_overlap_tokens,
                    )
                    flush()
                    if overlap_text:
                        current = [overlap_text]
                        current_tokens = token_counter.count(overlap_text)
                current.append(piece)
                current_tokens += piece_tokens
                if current_tokens >= chunk_size_tokens:
                    flush()

        flush()

    # Merge a tiny final chunk into its predecessor when the same section allows it.
    if len(chunks) >= 2 and token_counter.count(chunks[-1].content) < min_chunk_tokens:
        tail = chunks.pop()
        previous = chunks[-1]
        merged = f"{previous.content}\n\n{tail.content}".strip()
        if token_counter.count(merged) <= chunk_size_tokens + chunk_overlap_tokens:
            chunks[-1] = TextChunk(content=merged, section_path=previous.section_path)
        else:
            chunks.append(tail)
    return chunks


__all__ = ["TextChunk", "chunk_text", "chunk_text_tokens"]
