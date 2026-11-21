from __future__ import annotations

import pytest

from app.rag.factories.llm_factory import LLMFactory
from app.rag.graph.workflow import RAGWorkflow
from app.rag.types import SearchResult


def test_llm_factory_uses_mock_provider_for_local_workflow() -> None:
    llm = LLMFactory.create("mock")

    assert llm.provider == "mock"
    assert llm.streaming is True


def test_rag_workflow_generates_answer_with_citations() -> None:
    workflow = RAGWorkflow()
    documents = [
        SearchResult(
            document_id="doc-1",
            chunk_id="chunk-1",
            content="Python data pipelines and retrieval policy notes for secure processing.",
            score=0.91,
            metadata={"source": "python-policy.txt"},
        )
    ]

    state = workflow.run("What does the policy say about Python data handling?", dense_results=documents)

    assert state.status == "generated"
    assert "Python" in state.answer
    assert state.citations
    assert state.citations[0].document_id == "doc-1"


def test_rag_workflow_falls_back_when_no_documents_are_relevant() -> None:
    workflow = RAGWorkflow()

    state = workflow.run("What is the answer to a totally unrelated question?", dense_results=[])

    assert state.status == "fallback"
    assert "could not find enough" in state.answer.lower()


def test_live_llm_provider_requires_an_api_key() -> None:
    with pytest.raises(RuntimeError, match="LLM__API_KEY"):
        LLMFactory.create("openai")
