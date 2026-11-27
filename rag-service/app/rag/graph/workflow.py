"""Simple workflow runner that mirrors the RAG graph: rewrite → retrieve → grade → generate/fallback."""

from __future__ import annotations

import hashlib
import threading
import time
from collections.abc import Callable, Iterator

from app.rag.factories.llm_factory import ChatModel, LLMFactory
from app.rag.graph.edges import route_after_grading
from app.rag.graph.nodes import (
    build_answer_prompt,
    build_citations,
    fallback_answer,
    generate_answer,
    grade_documents,
    rerank_documents,
    retrieve_documents,
    rewrite_query,
)
from app.rag.types import RAGState, SearchResult


class _RewriteCache:
    def __init__(self, ttl_seconds: int) -> None:
        self.ttl = max(0, ttl_seconds)
        self._lock = threading.Lock()
        self._entries: dict[str, tuple[float, str]] = {}

    @staticmethod
    def _key(question: str, history: list[str]) -> str:
        material = "\n".join(history[-3:]) + "\x00" + question
        return hashlib.sha1(material.encode("utf-8")).hexdigest()

    def get(self, question: str, history: list[str]) -> str | None:
        if self.ttl <= 0:
            return None
        key = self._key(question, history)
        with self._lock:
            entry = self._entries.get(key)
            if entry is None or entry[0] < time.monotonic():
                self._entries.pop(key, None)
                return None
            return entry[1]

    def put(self, question: str, history: list[str], rewritten: str) -> None:
        if self.ttl <= 0:
            return
        with self._lock:
            self._entries[self._key(question, history)] = (time.monotonic() + self.ttl, rewritten)


class RAGWorkflow:
    """Deterministic, provider-agnostic workflow used for mock end-to-end validation."""

    def __init__(
        self,
        *,
        llm: ChatModel | None = None,
        prompt_templates: dict[str, str] | None = None,
        max_rewrite_retries: int = 2,
        skip_rewrite_max_words: int = 8,
        rewrite_cache_ttl_seconds: int = 600,
        grade_batch: bool = False,
        grade_batch_size: int = 5,
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
        self.skip_rewrite_max_words = max(0, skip_rewrite_max_words)
        self.grade_batch = grade_batch
        self.grade_batch_size = grade_batch_size
        self._rewrite_cache = _RewriteCache(rewrite_cache_ttl_seconds)

    def _rewrite(self, state: RAGState, llm: ChatModel) -> None:
        if not state.conversation_history and len(state.question.split()) <= self.skip_rewrite_max_words:
            state.rewritten_query = state.question
            state.status = "ready"
            return
        cached = self._rewrite_cache.get(state.question, state.conversation_history)
        if cached:
            state.rewritten_query = cached
            state.status = "ready"
            return
        rewrite_query(state, llm, prompt_template=self.prompt_templates["query_rewrite"])
        self._rewrite_cache.put(state.question, state.conversation_history, state.rewritten_query)

    def prepare(
        self,
        question: str,
        *,
        dense_results: list[SearchResult] | None = None,
        sparse_results: list[SearchResult] | None = None,
        history: list[str] | None = None,
        rerank_fn: Callable[..., list[SearchResult]] | None = None,
        retrieval_fn: Callable[[str], list[SearchResult]] | None = None,
    ) -> tuple[RAGState, ChatModel]:
        state = RAGState(
            question=question,
            conversation_history=list(history or []),
            max_retries=self.max_rewrite_retries,
        )
        llm = self.llm
        for _attempt in range(self.max_rewrite_retries + 1):
            self._rewrite(state, llm)
            state = retrieve_documents(
                state,
                dense_results=retrieval_fn(state.rewritten_query) if retrieval_fn else dense_results,
                sparse_results=None if retrieval_fn else sparse_results,
            )
            state = rerank_documents(state, rerank_fn=rerank_fn, query=state.rewritten_query)
            state = grade_documents(
                state,
                llm,
                prompt_template=self.prompt_templates["grade_documents"],
                max_batch_size=self.grade_batch_size,
                batch=self.grade_batch,
            )
            decision = route_after_grading(state)
            if decision == "generate":
                state.status = "ready"
                return state, llm
            if decision == "fallback":
                state = fallback_answer(
                    state,
                    llm,
                    prompt_template=self.prompt_templates["fallback"],
                )
                return state, llm
            state.retries += 1
            state.status = "retrying"
        state = fallback_answer(
            state,
            llm,
            prompt_template=self.prompt_templates["fallback"],
        )
        return state, llm

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
        state, llm = self.prepare(
            question,
            dense_results=dense_results,
            sparse_results=sparse_results,
            history=history,
            rerank_fn=rerank_fn,
            retrieval_fn=retrieval_fn,
        )
        if state.status == "fallback":
            return state
        return generate_answer(
            state,
            llm,
            system_template=self.prompt_templates["system_qa"],
            max_context_chars=max_context_chars,
            truncation_strategy=truncation_strategy,
        )

    def stream(
        self,
        state: RAGState,
        *,
        max_context_chars: int = 12000,
        truncation_strategy: str = "tail",
    ) -> Iterator[str]:
        """Yield answer tokens for a state returned by ``prepare``."""
        if state.status == "fallback":
            if state.fallback_answer:
                yield state.fallback_answer
            return

        system_prompt = build_answer_prompt(
            state,
            system_template=self.prompt_templates["system_qa"],
            max_context_chars=max_context_chars,
            truncation_strategy=truncation_strategy,
        )
        state.citations = build_citations(state.relevant_results)
        collected: list[str] = []
        for piece in self.llm.stream(
            state.rewritten_query or state.question,
            system_prompt=system_prompt,
        ):
            if not piece:
                continue
            collected.append(piece)
            yield piece
        state.answer = "".join(collected).strip()
        state.status = "generated"


__all__ = ["RAGWorkflow"]
