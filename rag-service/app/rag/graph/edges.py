"""Conditional routing rules for the RAG graph."""

from __future__ import annotations

from app.rag.types import RAGState


def route_after_grading(state: RAGState) -> str:
    """Choose the next state transition based on the grading result."""
    if state.relevant_results:
        return "generate"
    if state.retries < state.max_retries:
        return "rewrite"
    return "fallback"
