"""Small tuning matrix for chunking/fusion/reranker defaults."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from app.eval.dataset import EvalCase
from app.eval.runner import build_eval_settings, evaluate_dataset

CHUNK_SIZES = (256, 384, 512)
FUSIONS = ("rrf", "weighted")
RERANKERS = ("none", "simple")
THRESHOLDS = (0.0, 0.65)


def run_matrix(
    cases: Sequence[EvalCase],
    *,
    top_k: int = 5,
    run_workflow: bool = False,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for chunk_size in CHUNK_SIZES:
        for fusion in FUSIONS:
            for reranker in RERANKERS:
                for threshold in THRESHOLDS:
                    settings = build_eval_settings(
                        chunk_size_tokens=chunk_size,
                        chunk_overlap_tokens=max(16, chunk_size // 8),
                        fusion_strategy=fusion,
                        score_threshold=threshold,
                        reranker=reranker,
                    )
                    report = evaluate_dataset(
                        cases,
                        settings,
                        top_k=top_k,
                        run_workflow=run_workflow,
                    )
                    rows.append({"settings": report["config"], "aggregate": report["aggregate"]})
    rows.sort(key=lambda row: (row["aggregate"]["ndcg"], row["aggregate"]["recall"]), reverse=True)
    return rows


def render_matrix_markdown(rows: Sequence[dict[str, Any]]) -> str:
    lines = [
        "# Tuning matrix",
        "",
        "| chunk | fusion | reranker | threshold | recall | nDCG | MRR |",
        "| ---: | --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for row in rows:
        settings = row["settings"]
        aggregate = row["aggregate"]
        lines.append(
            f"| {settings['chunk_size_tokens']} | {settings['fusion_strategy']} | "
            f"{settings['reranker']} | {settings['score_threshold']} | "
            f"{aggregate['recall']:.4f} | {aggregate['ndcg']:.4f} | {aggregate['mrr']:.4f} |"
        )
    lines.append("")
    return "\n".join(lines)


__all__ = ["run_matrix", "render_matrix_markdown"]
