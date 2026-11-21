from __future__ import annotations

from pathlib import Path

import pytest
from pypdf import PdfWriter

from app.rag.ingestion import build_document_chunks
from app.rag.loaders import load_document_pages


def test_text_ingestion_preserves_page_and_stable_chunk_identity(tmp_path: Path) -> None:
    source = tmp_path / "lesson.md"
    source.write_text("A useful paragraph about retrieval and citations.", encoding="utf-8")
    arguments = {
        "document_id": "doc-1",
        "filename": source.name,
        "chunk_size": 80,
        "chunk_overlap": 10,
        "workspace_id": "workspace-1",
    }

    first = build_document_chunks(source, **arguments)
    second = build_document_chunks(source, **arguments)

    assert first[0].chunk_id == second[0].chunk_id
    assert first[0].document_id == "doc-1"
    assert first[0].page_number is None
    assert first[0].metadata["workspace_id"] == "workspace-1"
    assert "citations" in first[0].content


def test_pdf_loader_keeps_original_page_numbers(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    source = tmp_path / "lesson.pdf"
    source.write_bytes(b"%PDF-1.4")

    class _Page:
        def __init__(self, content: str) -> None:
            self.content = content

        def extract_text(self) -> str:
            return self.content

    class _Reader:
        is_encrypted = False
        pages = [_Page("first page"), _Page(""), _Page("third page")]

    monkeypatch.setattr("app.rag.loaders.PdfReader", lambda _: _Reader())

    pages = load_document_pages(source)
    chunks = build_document_chunks(
        source,
        document_id="doc-2",
        filename=source.name,
        chunk_size=100,
        chunk_overlap=10,
    )

    assert pages == [(1, "first page"), (2, ""), (3, "third page")]
    assert [chunk.page_number for chunk in chunks] == [1, 3]


def test_pdf_loader_reads_a_real_pdf_file(tmp_path: Path) -> None:
    source = tmp_path / "blank.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    with source.open("wb") as handle:
        writer.write(handle)

    assert load_document_pages(source) == [(1, "")]


def test_ingestion_rejects_empty_or_unsupported_content(tmp_path: Path) -> None:
    empty = tmp_path / "empty.txt"
    empty.write_text(" \n ", encoding="utf-8")
    unsupported = tmp_path / "unsupported.bin"
    unsupported.write_bytes(b"data")

    with pytest.raises(ValueError, match="no extractable text"):
        build_document_chunks(
            empty,
            document_id="empty",
            filename=empty.name,
            chunk_size=100,
            chunk_overlap=10,
        )

    with pytest.raises(ValueError, match="Unsupported document type"):
        build_document_chunks(
            unsupported,
            document_id="unsupported",
            filename=unsupported.name,
            chunk_size=100,
            chunk_overlap=10,
        )
