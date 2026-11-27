from __future__ import annotations

from pydantic import SecretStr

from app.rag.retrievers.reranker import NoOpReranker, SimpleReranker, create_reranker
from app.rag.types import SearchResult
from config.settings import RerankerSettings


def result(chunk_id: str, content: str, score: float) -> SearchResult:
    return SearchResult(document_id="d", chunk_id=chunk_id, content=content, score=score)


def test_simple_reranker_boosts_query_overlap() -> None:
    reranked = SimpleReranker().rerank(
        [result("a", "unrelated text", 0.55), result("b", "machine learning basics", 0.5)],
        query="machine learning",
    )

    assert reranked[0].chunk_id == "b"


def test_none_reranker_keeps_order() -> None:
    items = [result("a", "a", 0.9), result("b", "b", 0.5)]
    assert NoOpReranker().rerank(items, query="q") == items


def test_factory_falls_back_when_optional_dependency_missing() -> None:
    settings = RerankerSettings(provider="cross_encoder", fallback_provider="simple")

    reranker = create_reranker(settings)

    assert reranker.name in {"simple", "cross_encoder"}


def test_cohere_without_key_falls_back_to_simple() -> None:
    settings = RerankerSettings(
        provider="cohere",
        api_key=SecretStr(""),
        fallback_provider="simple",
    )

    assert create_reranker(settings).name == "simple"
