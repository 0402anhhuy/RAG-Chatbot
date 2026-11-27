"""Load and validate the JSONL evaluation dataset."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True, slots=True)
class EvalCase:
    id: str
    question: str
    document: str
    relevant_spans: tuple[str, ...]
    tags: tuple[str, ...] = ()
    workspace_id: str | None = None


def _text(value: Any, *, field: str, case_id: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"case {case_id}: {field} must be a non-empty string")
    return value.strip()


def _string_list(value: Any, *, field: str, case_id: str) -> tuple[str, ...]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"case {case_id}: {field} must be a non-empty list")
    items: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ValueError(f"case {case_id}: {field} contains an invalid item")
        items.append(item.strip())
    return tuple(items)


def parse_case(payload: Any) -> EvalCase:
    if not isinstance(payload, dict):
        raise ValueError("each dataset line must be a JSON object")
    case_id = _text(payload.get("id"), field="id", case_id="unknown")
    tags_raw = payload.get("tags", [])
    tags = (
        tuple(str(item).strip() for item in tags_raw if str(item).strip())
        if isinstance(tags_raw, list)
        else ()
    )
    workspace = payload.get("workspace_id")
    return EvalCase(
        id=case_id,
        question=_text(payload.get("question"), field="question", case_id=case_id),
        document=_text(payload.get("document"), field="document", case_id=case_id),
        relevant_spans=_string_list(
            payload.get("relevant_spans"), field="relevant_spans", case_id=case_id
        ),
        tags=tags,
        workspace_id=str(workspace).strip() if isinstance(workspace, str) and workspace.strip() else None,
    )


def load_dataset(path: str | Path) -> list[EvalCase]:
    dataset_path = Path(path)
    if not dataset_path.exists():
        raise FileNotFoundError(f"dataset not found: {dataset_path}")
    cases: list[EvalCase] = []
    seen: set[str] = set()
    with dataset_path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                case = parse_case(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{dataset_path}:{line_number}: invalid JSON") from exc
            if case.id in seen:
                raise ValueError(f"{dataset_path}:{line_number}: duplicate id {case.id}")
            seen.add(case.id)
            cases.append(case)
    if not cases:
        raise ValueError(f"dataset is empty: {dataset_path}")
    return cases


__all__ = ["EvalCase", "load_dataset", "parse_case"]
