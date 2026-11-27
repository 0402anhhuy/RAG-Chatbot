from __future__ import annotations

from collections.abc import Iterator

from app.rag.graph.workflow import RAGWorkflow
from app.rag.types import SearchResult


class CountingLLM:
    provider = "mock"
    model_name = "counting"
    streaming = True
    last_usage = None

    def __init__(self) -> None:
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, system_prompt: str | None = None, **kwargs) -> str:
        self.prompts.append(prompt)
        if "rewrite" in prompt.lower():
            return "rewritten query"
        if "check whether" in prompt.lower():
            return '{"score": "yes"}'
        return "answer text"

    def stream(self, prompt: str, *, system_prompt: str | None = None, **kwargs) -> Iterator[str]:
        yield from ["answer ", "text"]


def hit() -> SearchResult:
    return SearchResult(
        document_id="doc",
        chunk_id="chunk",
        content="supporting context",
        score=1.0,
        metadata={"filename": "a.md"},
    )


def test_short_question_skips_rewrite() -> None:
    llm = CountingLLM()
    workflow = RAGWorkflow(llm=llm, skip_rewrite_max_words=8)  # type: ignore[arg-type]

    state = workflow.run("what is RAG?", retrieval_fn=lambda _query: [hit()])

    assert state.status == "generated"
    assert all("rewrite" not in prompt.lower() for prompt in llm.prompts)


def test_rewrite_is_cached_between_runs() -> None:
    llm = CountingLLM()
    workflow = RAGWorkflow(llm=llm, skip_rewrite_max_words=1, rewrite_cache_ttl_seconds=60)  # type: ignore[arg-type]
    question = "this is a longer question that should be rewritten"

    workflow.run(question, retrieval_fn=lambda _query: [hit()])
    first_rewrites = sum("rewrite" in prompt.lower() for prompt in llm.prompts)
    workflow.run(question, retrieval_fn=lambda _query: [hit()])
    second_rewrites = sum("rewrite" in prompt.lower() for prompt in llm.prompts)

    assert first_rewrites == 1
    assert second_rewrites == 1


def test_stream_yields_pieces_and_citations() -> None:
    llm = CountingLLM()
    workflow = RAGWorkflow(llm=llm, skip_rewrite_max_words=8)  # type: ignore[arg-type]
    state, _ = workflow.prepare("what is RAG?", retrieval_fn=lambda _query: [hit()])

    pieces = list(workflow.stream(state))

    assert pieces == ["answer ", "text"]
    assert state.citations[0].chunk_id == "chunk"
    assert state.status == "generated"
