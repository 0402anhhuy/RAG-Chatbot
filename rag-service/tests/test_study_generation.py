from __future__ import annotations

import json

import pytest

from app.api.v1.study import _generate_items
from app.rag.types import DocumentChunk


class FixedStudyModel:
    provider = "mock"
    model_name = "fixed"
    streaming = False

    def __init__(self, response: str) -> None:
        self.response = response

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs: object) -> str:
        return self.response

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs: object) -> list[str]:
        return [self.response]


@pytest.mark.parametrize(
    ("tool", "response", "expected_key"),
    [
        (
            "flashcards",
            json.dumps(
                [
                    {
                        "question": "What is RAG?",
                        "answer": "Retrieval augmented generation.",
                        "source_chunk_id": "chunk-1",
                    },
                    {"question": "Untrusted", "answer": "Not sourced.", "source_chunk_id": "foreign-chunk"},
                ]
            ),
            "flashcards",
        ),
        (
            "exams",
            json.dumps(
                [
                    {
                        "question": "Which method retrieves documents?",
                        "options": {"A": "BM25", "B": "X", "C": "Y", "D": "Z"},
                        "correct_answer": "A",
                        "source_chunk_id": "chunk-1",
                    },
                    {
                        "question": "Untrusted",
                        "options": {"A": "A", "B": "B", "C": "C", "D": "D"},
                        "correct_answer": "A",
                        "source_chunk_id": "foreign-chunk",
                    },
                ]
            ),
            "questions",
        ),
    ],
)
def test_study_generators_only_return_items_with_known_source_chunks(tool, response, expected_key) -> None:
    chunk = DocumentChunk(
        chunk_id="chunk-1",
        document_id="doc-1",
        content="BM25 retrieves documents by term relevance.",
        chunk_index=0,
        page_number=3,
        metadata={"workspace_id": "workspace-1"},
    )

    items = _generate_items(
        tool=tool,
        chunks=[chunk],
        max_items=10,
        llm=FixedStudyModel(response),
    )

    assert len(items) == 1
    assert items[0]["chunk_id"] == "chunk-1"
    assert items[0]["document_id"] == "doc-1"
    assert items[0]["page"] == 3
    if expected_key == "questions":
        assert set(items[0]["options"]) == {"A", "B", "C", "D"}
    else:
        assert items[0]["question"] == "What is RAG?"
