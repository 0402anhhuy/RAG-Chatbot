"""Simple workflow runner that mirrors the RAG graph: rewrite → retrieve → grade → generate/fallback."""

from __future__ import annotations

from collections.abc import Callable

from app.rag.factories.llm_factory import ChatModel, LLMFactory
from app.rag.graph.edges import route_after_grading
from app.rag.graph.nodes import (
    fallback_answer,
    generate_answer,
    grade_documents,
    rerank_documents,
    retrieve_documents,
    rewrite_query,
)
from app.rag.types import RAGState, SearchResult


class RAGWorkflow:
    """Deterministic, provider-agnostic workflow used for mock end-to-end validation."""

    def __init__(
        self,
        *,
        llm: ChatModel | None = None,
        prompt_templates: dict[str, str] | None = None,
        max_rewrite_retries: int = 2,
    ) -> None:
        self.llm = llm or LLMFactory.create("mock")
        self.prompt_templates = {
            "query_rewrite": (
                "Rewrite the user's latest question into a self-contained retrieval "
                "query. Return only the rewritten query.\n\nQuestion: {question}\n"
                "History: {history}"
            ),
            "grade_documents": (
                "Check whether the following snippet is relevant to answering the "
                'question: {question}. Return JSON {{"score": "yes" | "no"}}.'
                "\n\nSnippet:\n{snippet}"
            ),
            "system_qa": (
                "You are a careful AI assistant. Use ONLY the supplied context and "
                "say clearly when the answer is not present.\n\n<context>\n"
                "{context}\n</context>"
            ),
            "fallback": (
                "I could not find enough supporting information in the current "
                "documents to answer this question. Please provide more context or "
                "refine the question."
            ),
            **(prompt_templates or {}),
        }
        self.max_rewrite_retries = max_rewrite_retries

    def run(
        self,
        question: str,
        *,
        dense_results: list[SearchResult] | None = None,
        sparse_results: list[SearchResult] | None = None,
        history: list[str] | None = None,
        rerank_fn: Callable[..., list[SearchResult]] | None = None,
        retrieval_fn: Callable[[str], list[SearchResult]] | None = None,
        max_context_chars: int = 12000,
        truncation_strategy: str = "tail",
    ) -> RAGState:
        state = RAGState(
            question=question,
            conversation_history=list(history or []),
            max_retries=self.max_rewrite_retries,
        )
        for _attempt in range(self.max_rewrite_retries + 1):
            state = rewrite_query(
                state,
                self.llm,
                prompt_template=self.prompt_templates["query_rewrite"],
            )
            state = retrieve_documents(
                state,
                dense_results=retrieval_fn(state.rewritten_query) if retrieval_fn else dense_results,
                sparse_results=None if retrieval_fn else sparse_results,
            )
            state = rerank_documents(state, rerank_fn=rerank_fn, query=state.rewritten_query)
            state = grade_documents(
                state,
                self.llm,
                prompt_template=self.prompt_templates["grade_documents"],
                max_batch_size=5,
            )
            decision = route_after_grading(state)
            if decision == "generate":
                state = generate_answer(
                    state,
                    self.llm,
                    system_template=self.prompt_templates["system_qa"],
                    max_context_chars=max_context_chars,
                    truncation_strategy=truncation_strategy,
                )
                return state
            if decision == "fallback":
                state = fallback_answer(
                    state,
                    self.llm,
                    prompt_template=self.prompt_templates["fallback"],
                )
                return state
            state.retries += 1
            state.status = "retrying"
        state = fallback_answer(
            state,
            self.llm,
            prompt_template=self.prompt_templates["fallback"],
        )
        return state


__all__ = ["RAGWorkflow"]
