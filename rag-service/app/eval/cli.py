"""CLI: python -m app.eval.cli --dataset eval/vi_golden.jsonl --out eval-out."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.eval.dataset import load_dataset
from app.eval.runner import build_eval_settings, evaluate_dataset, render_markdown
from app.eval.tuning import render_matrix_markdown, run_matrix
from app.rag.factories.llm_factory import LLMFactory


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Offline RAG retrieval evaluation")
    parser.add_argument("--dataset", default="eval/vi_golden.jsonl")
    parser.add_argument("--out", default="eval-out")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--chunk-size-tokens", type=int, default=512)
    parser.add_argument("--chunk-overlap-tokens", type=int, default=64)
    parser.add_argument("--fusion", choices=["rrf", "weighted"], default="weighted")
    parser.add_argument("--threshold", type=float, default=0.0)
    parser.add_argument("--reranker", choices=["none", "simple", "cross_encoder", "cohere"], default="none")
    parser.add_argument("--strip-diacritics", action="store_true")
    parser.add_argument("--live", action="store_true", help="Use the configured live LLM instead of MockLLM")
    parser.add_argument("--index-version", default="chunk-v2")
    parser.add_argument("--no-workflow", action="store_true", help="Skip answer/fallback/groundedness metrics")
    parser.add_argument("--matrix", action="store_true", help="Run the built-in tuning grid instead")
    parser.add_argument("--min-recall", type=float, default=None)
    parser.add_argument("--min-ndcg", type=float, default=None)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    dataset_path = Path(args.dataset)
    cases = load_dataset(dataset_path)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.matrix:
        rows = run_matrix(cases, top_k=args.top_k, run_workflow=not args.no_workflow)
        (out_dir / "matrix.json").write_text(
            json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        (out_dir / "matrix.md").write_text(render_matrix_markdown(rows), encoding="utf-8")
        print(f"matrix: {len(rows)} configs → {out_dir / 'matrix.md'}")
        return 0

    settings = build_eval_settings(
        chunk_size_tokens=args.chunk_size_tokens,
        chunk_overlap_tokens=args.chunk_overlap_tokens,
        index_version=args.index_version,
        fusion_strategy=args.fusion,
        score_threshold=args.threshold,
        reranker=args.reranker,
        strip_diacritics=args.strip_diacritics,
        live=args.live,
    )
    llm = None
    if args.live:
        llm = LLMFactory.create(
            settings.llm.provider,
            model_name=settings.llm.model,
            temperature=settings.llm.temperature,
            max_tokens=settings.llm.max_tokens,
            timeout=settings.llm.request_timeout,
            max_retries=settings.llm.max_retries,
            retry_backoff_ms=settings.llm.retry_backoff_ms,
            api_key=settings.llm.api_key.get_secret_value(),
            base_url=settings.llm.base_url,
        )
    report = evaluate_dataset(
        cases,
        settings,
        top_k=args.top_k,
        run_workflow=not args.no_workflow,
        llm=llm,
    )
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out_dir / "report.md").write_text(render_markdown(report), encoding="utf-8")

    aggregate = report["aggregate"]
    print(
        f"cases={aggregate['cases']} recall@{args.top_k}={aggregate['recall']:.4f} "
        f"ndcg@{args.top_k}={aggregate['ndcg']:.4f} mrr={aggregate['mrr']:.4f} "
        f"p50={aggregate['latency_ms_p50']:.1f}ms"
    )
    if args.min_recall is not None and aggregate["recall"] < args.min_recall:
        print(f"FAIL: recall {aggregate['recall']:.4f} < {args.min_recall}", file=sys.stderr)
        return 1
    if args.min_ndcg is not None and aggregate["ndcg"] < args.min_ndcg:
        print(f"FAIL: ndcg {aggregate['ndcg']:.4f} < {args.min_ndcg}", file=sys.stderr)
        return 1
    print(f"wrote {out_dir / 'report.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
