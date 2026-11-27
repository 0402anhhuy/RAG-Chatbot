from __future__ import annotations

import json
from pathlib import Path

from app.eval.cli import main


def test_cli_writes_report_and_enforces_threshold(tmp_path: Path) -> None:
    dataset = tmp_path / "cases.jsonl"
    dataset.write_text(
        json.dumps(
            {
                "id": "c1",
                "question": "Học máy là gì?",
                "document": "Học máy là một lĩnh vực của trí tuệ nhân tạo.",
                "relevant_spans": ["Học máy là một lĩnh vực"],
            }
        )
        + "\n",
        encoding="utf-8",
    )
    out = tmp_path / "out"

    code = main(
        [
            "--dataset",
            str(dataset),
            "--out",
            str(out),
            "--chunk-size-tokens",
            "128",
            "--chunk-overlap-tokens",
            "16",
            "--no-workflow",
            "--min-recall",
            "1.0",
        ]
    )

    assert code == 0
    assert (out / "report.json").exists()
    assert (out / "report.md").exists()
