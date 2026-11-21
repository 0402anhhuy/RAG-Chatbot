"""Lightweight retrieval quality-gate utilities for managed evaluation runs."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol


class _ScoreBearing(Protocol):
    score: float


@dataclass(frozen=True)
class QualityGateResult:
    average_score: float
    hit_rate: float
    grounded_documents: int
    total_documents: int
    passed: bool
    thresholds: dict[str, float]


def evaluate_retrieval_quality(
    results: Sequence[_ScoreBearing],
    *,
    min_average_score: float = 0.65,
    min_hit_rate: float = 0.75,
    min_grounded_documents: int = 1,
    relevance_threshold: float = 0.65,
) -> QualityGateResult:
    """Return a simple, deterministic quality summary for a retrieval batch.

    The goal is to provide a stable signal for local validation without depending
    on an external evaluation service. The defaults mirror the project's retrieval
    expectations while staying conservative for mock/local runs.
    """
    if not results:
        return QualityGateResult(
            average_score=0.0,
            hit_rate=0.0,
            grounded_documents=0,
            total_documents=0,
            passed=False,
            thresholds={
                "min_average_score": min_average_score,
                "min_hit_rate": min_hit_rate,
                "min_grounded_documents": float(min_grounded_documents),
            },
        )

    average_score = sum(float(item.score) for item in results) / len(results)
    hit_count = sum(1 for item in results if float(item.score) >= relevance_threshold)
    grounded_documents = hit_count
    hit_rate = hit_count / len(results)
    passed = (
        average_score >= min_average_score and hit_rate >= min_hit_rate and grounded_documents >= min_grounded_documents
    )

    return QualityGateResult(
        average_score=average_score,
        hit_rate=hit_rate,
        grounded_documents=grounded_documents,
        total_documents=len(results),
        passed=passed,
        thresholds={
            "min_average_score": min_average_score,
            "min_hit_rate": min_hit_rate,
            "min_grounded_documents": float(min_grounded_documents),
        },
    )
