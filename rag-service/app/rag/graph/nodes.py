"""RAG graph node functions for rewrite, retrieval, grading, generation, and fallback."""

from __future__ import annotations

import json
from typing import Any

from app.rag.factories.llm_factory import ChatModel
from app.rag.types import Citation, RAGState, SearchResult


def rewrite_query(state: RAGState, llm: ChatModel, *, prompt_template: str) -> RAGState:
    """Normalize the user question into a self-contained search query."""
    payload = prompt_template.format(
        question=state.question,
        history="\n".join(state.conversation_history[-3:]),
    )
    rewritten = llm.complete(payload, system_prompt=None)
    state.rewritten_query = rewritten.strip() or state.question
    if state.rewritten_query.startswith("Rewritten query:"):
        candidate = state.rewritten_query.split(":", 1)[1].strip()
        if (
            not candidate
            or "question:" in candidate.lower()
            or "history:" in candidate.lower()
            or "return only the rewritten query" in candidate.lower()
        ):
            state.rewritten_query = state.question
        else:
            state.rewritten_query = candidate
    state.status = "ready"
    return state


def retrieve_documents(
    state: RAGState,
    *,
    dense_results: list[SearchResult] | None = None,
    sparse_results: list[SearchResult] | None = None,
) -> RAGState:
    """Store the dense and sparse retrieval candidates on the state."""
    state.retrieval_results = list(dense_results or []) + list(sparse_results or [])
    return state


def rerank_documents(state: RAGState, *, rerank_fn: Any | None = None, query: str | None = None) -> RAGState:
    """Optional rerank pass before grading. When no reranker is configured, the original order is kept."""
    if rerank_fn is None:
        state.reranked_results = list(state.retrieval_results)
        return state
    state.reranked_results = rerank_fn(state.retrieval_results, query=query or state.rewritten_query)
    return state


def _grade_response(payload: str) -> bool:
    cleaned = payload.strip()
    if not cleaned:
        return False
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        lowered = cleaned.lower()
        return lowered in {"yes", "y", "true", "1"}
    score_value = parsed.get("score") if isinstance(parsed, dict) else None
    if isinstance(score_value, str):
        return score_value.lower() == "yes"
    return bool(score_value)


def grade_documents(
    state: RAGState,
    llm: ChatModel,
    *,
    prompt_template: str,
    max_batch_size: int | None = None,
) -> RAGState:
    """Keep only the snippets the model considers useful for the question."""
    candidates = list(state.reranked_results or state.retrieval_results)
    if max_batch_size is not None:
        candidates = candidates[:max_batch_size]

    state.relevant_results = []
    for result in candidates:
        prompt = prompt_template.format(
            question=state.rewritten_query or state.question,
            snippet=result.content,
        )
        response = llm.complete(prompt)
        if _grade_response(response):
            state.relevant_results.append(result)
    return state


def _truncate_context(context: str, *, max_chars: int, strategy: str = "tail") -> str:
    if len(context) <= max_chars:
        return context
    if strategy == "head":
        return context[:max_chars]
    if strategy == "middle-out":
        midpoint = max_chars // 2
        head = context[:midpoint]
        tail = context[-(max_chars - midpoint) :]
        return f"{head}...{tail}"
    return context[-max_chars:]


def build_citations(results: list[SearchResult]) -> list[Citation]:
    citations: list[Citation] = []
    for result in results:
        metadata = dict(result.metadata)
        citations.append(
            Citation(
                document_id=result.document_id,
                chunk_id=result.chunk_id,
                score=result.score,
                snippet=result.content[:200],
                source=str(metadata.get("source") or metadata.get("filename") or result.document_id),
                page_number=metadata.get("page_number"),
            )
        )
    return citations


def generate_answer(
    state: RAGState,
    llm: ChatModel,
    *,
    system_template: str,
    max_context_chars: int = 12000,
    truncation_strategy: str = "tail",
) -> RAGState:
    """Create a final answer from the relevant snippets and attach citations."""
    context_parts = [f"[{index + 1}] {result.content}" for index, result in enumerate(state.relevant_results)]
    state.context = _truncate_context(
        "\n".join(context_parts),
        max_chars=max_context_chars,
        strategy=truncation_strategy,
    )
    system_prompt = system_template.format(context=state.context)
    state.answer = llm.complete(
        state.rewritten_query or state.question,
        system_prompt=system_prompt,
    )
    state.citations = build_citations(state.relevant_results)
    state.status = "generated"
    return state


def fallback_answer(state: RAGState, llm: ChatModel, *, prompt_template: str) -> RAGState:
    """Return the graceful no-context answer when retrieval or grading fails."""
    state.fallback_answer = llm.complete(prompt_template, system_prompt=None)
    state.answer = state.fallback_answer
    state.status = "fallback"
    return state
