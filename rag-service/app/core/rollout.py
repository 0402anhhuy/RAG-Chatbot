"""Operational safety helpers for migration parity and rollout checks."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class MigrationParityReport:
    expected_versions: tuple[int, ...]
    applied_versions: tuple[int, ...]
    missing_versions: tuple[int, ...]
    unexpected_versions: tuple[int, ...]
    is_ready: bool


@dataclass(frozen=True)
class RolloutPlan:
    ready: bool
    migration_sequence: tuple[str, ...]
    rollback_sequence: tuple[str, ...]
    notes: tuple[str, ...]


def _sorted_migration_files(migrations_dir: Path | str) -> list[Path]:
    root = Path(migrations_dir)
    if not root.exists():
        return []
    return sorted(root.glob("*.sql"), key=lambda item: item.name)


def compare_migration_parity(
    migrations_dir: Path | str,
    applied_versions: Sequence[tuple[int, str]],
) -> MigrationParityReport:
    """Compare the on-disk migration set against the database-applied versions."""
    expected_versions = tuple(
        int(path.name.split("_", 1)[0]) for path in _sorted_migration_files(migrations_dir) if path.name.count("_") >= 1
    )
    applied = tuple(sorted(applied_versions, key=lambda item: item[0]))
    applied_versions_tuple = tuple(version for version, _ in applied)
    missing_versions = tuple(version for version in expected_versions if version not in applied_versions_tuple)
    unexpected_versions = tuple(version for version, _ in applied if version not in expected_versions)
    ready = expected_versions == applied_versions_tuple and not missing_versions and not unexpected_versions
    return MigrationParityReport(
        expected_versions=expected_versions,
        applied_versions=applied_versions_tuple,
        missing_versions=missing_versions,
        unexpected_versions=unexpected_versions,
        is_ready=ready,
    )


def build_rollout_plan(
    migrations_dir: Path | str,
    applied_versions: Sequence[tuple[int, str]],
) -> RolloutPlan:
    """Return a rollback-safe upgrade and rollback sequence for a staged deploy."""
    report = compare_migration_parity(migrations_dir, applied_versions)
    expected_names = {
        int(path.name.split("_", 1)[0]): path.name
        for path in _sorted_migration_files(migrations_dir)
        if path.name.count("_") >= 1
    }
    migration_sequence = tuple(
        expected_names[version] for version in report.expected_versions if version not in report.applied_versions
    )
    rollback_sequence = tuple(
        f"rollback version {version}: {migration_name}"
        for version, migration_name in reversed(tuple(sorted(applied_versions, key=lambda item: item[0])))
    )
    notes = (
        "Cutover is safe only when the parity report is clean and no migration is missing or unknown.",
        "Rollback must reverse the last successful migration set in the same order it was applied.",
    )
    return RolloutPlan(
        ready=report.is_ready,
        migration_sequence=migration_sequence,
        rollback_sequence=rollback_sequence,
        notes=notes,
    )


__all__ = [
    "MigrationParityReport",
    "RolloutPlan",
    "build_rollout_plan",
    "compare_migration_parity",
]
