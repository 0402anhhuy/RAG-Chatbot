from __future__ import annotations

from app.rag.splitters import chunk_text_tokens
from app.rag.tokenization import HeuristicTokenCounter


def test_heading_aware_token_chunks_stay_near_budget() -> None:
    counter = HeuristicTokenCounter()
    text = (
        "# Intro\n\n"
        + ("alpha beta gamma delta " * 80)
        + "\n\n## Details\n\n"
        + ("học máy là một lĩnh vực của trí tuệ nhân tạo " * 60)
    )

    chunks = chunk_text_tokens(
        text,
        chunk_size_tokens=60,
        chunk_overlap_tokens=12,
        min_chunk_tokens=10,
        counter=counter,
    )

    assert len(chunks) > 2
    paths = {chunk.section_path for chunk in chunks}
    assert any(path and path.endswith("Intro") for path in paths)
    assert any(path and path.endswith("Details") for path in paths)
    assert max(counter.count(chunk.content) for chunk in chunks) <= 60 + 12 + 2


def test_short_text_is_one_chunk() -> None:
    chunks = chunk_text_tokens("một đoạn ngắn", chunk_size_tokens=100, chunk_overlap_tokens=10)
    assert len(chunks) == 1
    assert chunks[0].content == "một đoạn ngắn"


def test_oversized_paragraph_is_split() -> None:
    chunks = chunk_text_tokens(
        "một hai ba bốn năm sáu bảy tám chín mười " * 40,
        chunk_size_tokens=30,
        chunk_overlap_tokens=5,
    )
    assert len(chunks) > 3
