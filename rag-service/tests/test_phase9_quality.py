from __future__ import annotations

import pytest

from app.core.quality import evaluate_retrieval_quality
from app.core.upload_policy import validate_upload_file


class _Result:
    def __init__(self, score: float) -> None:
        self.score = score


def test_retrieval_quality_gate_passes_for_strong_retrieval_batch() -> None:
    results = [_Result(0.94), _Result(0.87), _Result(0.7), _Result(0.63)]

    summary = evaluate_retrieval_quality(results)

    assert summary.passed is True
    assert summary.average_score >= 0.65
    assert summary.hit_rate >= 0.75


def test_retrieval_quality_gate_fails_for_weak_batch() -> None:
    results = [_Result(0.2), _Result(0.1), _Result(0.05)]

    summary = evaluate_retrieval_quality(results)

    assert summary.passed is False
    assert summary.hit_rate < 0.75


def test_upload_guard_rejects_empty_and_path_traversal_inputs() -> None:
    with pytest.raises(ValueError, match="filename is required"):
        validate_upload_file("", file_size_bytes=1024)

    with pytest.raises(ValueError, match="invalid path traversal"):
        validate_upload_file("../../secrets.txt", file_size_bytes=1024)

    with pytest.raises(ValueError, match="file is empty"):
        validate_upload_file("notes.txt", file_size_bytes=0)

    with pytest.raises(ValueError, match="unsupported file extension"):
        validate_upload_file("archive.exe", file_size_bytes=1024)

    with pytest.raises(ValueError, match="size limit"):
        validate_upload_file("notes.txt", file_size_bytes=20 * 1024 * 1024)
