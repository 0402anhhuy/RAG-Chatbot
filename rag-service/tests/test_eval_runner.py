from __future__ import annotations

from app.eval.dataset import EvalCase
from app.eval.runner import build_eval_settings, evaluate_dataset, render_markdown


def case(case_id: str = "c1") -> EvalCase:
    return EvalCase(
        id=case_id,
        question="Học máy là gì?",
        document=(
            "Phần mở đầu nói về vận hành và chi phí.\n\n"
            "Học máy là một lĩnh vực của trí tuệ nhân tạo và xây dựng mô hình từ dữ liệu.\n\n"
            "Phần kết luận nhắc lại quy trình kiểm thử."
        ),
        relevant_spans=("Học máy là một lĩnh vực của trí tuệ nhân tạo",),
        workspace_id="eval-c1",
    )


def test_evaluate_dataset_returns_metrics_and_cases() -> None:
    settings = build_eval_settings(chunk_size_tokens=128, chunk_overlap_tokens=16)

    report = evaluate_dataset([case()], settings, top_k=3, run_workflow=False)

    assert report["aggregate"]["cases"] == 1
    assert report["aggregate"]["recall"] == 1.0
    assert report["cases"][0]["retrieved_chunk_ids"]
    assert "nDCG" in render_markdown(report)
