from __future__ import annotations

from app.eval.metrics import groundedness, ndcg_at_k, precision_at_k, recall_at_k, reciprocal_rank


def test_recall_precision_mrr() -> None:
    retrieved = ["a", "b", "c"]
    relevant = {"b", "d"}

    assert recall_at_k(retrieved, relevant, 3) == 0.5
    assert precision_at_k(retrieved, relevant, 3) == 1 / 3
    assert reciprocal_rank(retrieved, relevant) == 0.5


def test_ndcg_rewards_relevant_at_top() -> None:
    relevant = {"b"}

    assert ndcg_at_k(["b", "a"], relevant, 2) == 1.0
    assert ndcg_at_k(["a", "b"], relevant, 2) < 1.0


def test_groundedness_is_share_of_cited_relevant() -> None:
    assert groundedness(["a", "b"], {"a"}) == 0.5
    assert groundedness([], {"a"}) == 0.0
