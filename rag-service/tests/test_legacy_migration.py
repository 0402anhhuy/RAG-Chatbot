from __future__ import annotations

import asyncio
import json
from pathlib import Path

from app.core.db import Database
from app.operations.migrate_legacy_documents import run_migration
from app.rag.document_catalog import DocumentCatalog
from config.settings import (
    AppSettings,
    BM25Settings,
    DatabaseSettings,
    IngestSettings,
    Settings,
    UploadSettings,
)


def migration_settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        app=AppSettings(env="test"),
        database=DatabaseSettings(path=str(tmp_path / "app.db")),
        bm25=BM25Settings(persist_path=str(tmp_path / "bm25.jsonl")),
        ingest=IngestSettings(queue_path=str(tmp_path / "queue.db")),
        upload=UploadSettings(directory=str(tmp_path / "uploads")),
    )


def write_manifest(path: Path, rows: list[dict[str, str]]) -> None:
    path.write_text(
        "".join(json.dumps(row) + "\n" for row in rows),
        encoding="utf-8",
    )


def test_legacy_migration_dry_run_reports_missing_and_out_of_scope_files(tmp_path: Path) -> None:
    root = tmp_path / "legacy"
    root.mkdir()
    (root / "existing.txt").write_text("migration source", encoding="utf-8")
    outside = tmp_path / "outside.txt"
    outside.write_text("outside source", encoding="utf-8")
    manifest = tmp_path / "manifest.jsonl"
    write_manifest(
        manifest,
        [
            {
                "documentId": "doc-ready",
                "workspaceId": "workspace-1",
                "filename": "existing.txt",
                "storagePath": "existing.txt",
            },
            {
                "documentId": "doc-missing",
                "workspaceId": "workspace-1",
                "filename": "missing.txt",
                "storagePath": "missing.txt",
            },
            {
                "documentId": "doc-outside",
                "workspaceId": "workspace-1",
                "filename": "outside.txt",
                "storagePath": str(outside),
            },
        ],
    )

    report = asyncio.run(
        run_migration(
            manifest_path=manifest,
            source_root=root,
            report_path=tmp_path / "report.json",
            settings=migration_settings(tmp_path),
        )
    )

    assert report["mode"] == "dry-run"
    assert report["summary"]["would_import"] == 1
    assert report["summary"]["missing"] == 1
    assert report["summary"]["out_of_scope"] == 1
    assert json.loads((tmp_path / "report.json").read_text(encoding="utf-8")) == report


def test_legacy_migration_preserves_ids_and_workspace_and_is_idempotent(tmp_path: Path) -> None:
    root = tmp_path / "legacy"
    root.mkdir()
    (root / "course.txt").write_text("A stored document is now indexed.", encoding="utf-8")
    manifest = tmp_path / "manifest.jsonl"
    write_manifest(
        manifest,
        [
            {
                "documentId": "legacy-document-1",
                "workspaceId": "legacy-workspace-1",
                "filename": "course.txt",
                "storagePath": "course.txt",
                "courseCode": "RAG",
            }
        ],
    )
    settings = migration_settings(tmp_path)

    first = asyncio.run(
        run_migration(
            manifest_path=manifest,
            source_root=root,
            report_path=tmp_path / "first-report.json",
            apply=True,
            settings=settings,
        )
    )
    second = asyncio.run(
        run_migration(
            manifest_path=manifest,
            source_root=root,
            report_path=tmp_path / "second-report.json",
            apply=True,
            settings=settings,
        )
    )
    database = Database(settings.database.path)
    catalog = DocumentCatalog(database)
    document = asyncio.run(catalog.get_document("legacy-document-1"))

    assert first["summary"]["indexed"] == 1
    assert second["summary"]["already_imported"] == 1
    assert document is not None
    assert document["workspace_id"] == "legacy-workspace-1"
    assert document["status"] == "ready"
