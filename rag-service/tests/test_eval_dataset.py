from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.eval.dataset import load_dataset, parse_case


def test_parse_case_requires_spans() -> None:
    case = parse_case(
        {
            "id": "c1",
            "question": "q",
            "document": "doc",
            "relevant_spans": ["doc"],
            "tags": ["test"],
        }
    )

    assert case.id == "c1"
    assert case.tags == ("test",)

    with pytest.raises(ValueError):
        parse_case({"id": "c2", "question": "q", "document": "doc", "relevant_spans": []})


def test_load_dataset_rejects_duplicate_ids(tmp_path) -> None:
    path = tmp_path / "data.jsonl"
    row = {"id": "c1", "question": "q", "document": "doc", "relevant_spans": ["doc"]}
    path.write_text(json.dumps(row) + "\n" + json.dumps(row) + "\n", encoding="utf-8")

    with pytest.raises(ValueError):
        load_dataset(path)


def test_golden_dataset_has_100_unique_cases() -> None:
    cases = load_dataset(Path(__file__).resolve().parents[1] / "eval" / "vi_golden.jsonl")

    assert len(cases) == 100
    assert len({case.id for case in cases}) == 100
    assert all(case.relevant_spans for case in cases)
