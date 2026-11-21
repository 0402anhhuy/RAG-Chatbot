from __future__ import annotations

from pathlib import Path

import aiosqlite
import pytest

from app.core.db import Database, DatabaseError


@pytest.mark.asyncio
async def test_initialize_applies_migrations_and_is_idempotent(tmp_path: Path) -> None:
    database = Database(tmp_path / "nested" / "app.db")

    await database.initialize()
    await database.initialize()

    assert await database.healthcheck()
    async with database.connect() as connection:
        cursor = await connection.execute("SELECT version, name FROM schema_migrations")
        migrations = await cursor.fetchall()
        assert [(row["version"], row["name"]) for row in migrations] == [
            (1, "0001_service_metadata.sql"),
            (2, "0002_ingest_queue.sql"),
            (3, "0003_documents_and_chunks.sql"),
        ]
        cursor = await connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'service_metadata'"
        )
        assert await cursor.fetchone() is not None
        cursor = await connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ingest_jobs'"
        )
        assert await cursor.fetchone() is not None
        cursor = await connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'document_chunks'"
        )
        assert await cursor.fetchone() is not None


@pytest.mark.asyncio
async def test_modified_applied_migration_fails_explicitly(tmp_path: Path) -> None:
    migrations = tmp_path / "migrations"
    migrations.mkdir()
    migration = migrations / "0001_create_table.sql"
    migration.write_text("CREATE TABLE sample (id INTEGER PRIMARY KEY);", encoding="utf-8")
    database = Database(tmp_path / "app.db", migrations_dir=migrations)
    await database.initialize()

    migration.write_text("CREATE TABLE changed (id INTEGER PRIMARY KEY);", encoding="utf-8")
    with pytest.raises(DatabaseError, match="was modified"):
        await database.migrate()


@pytest.mark.asyncio
async def test_failed_migration_rolls_back_schema_changes(tmp_path: Path) -> None:
    migrations = tmp_path / "migrations"
    migrations.mkdir()
    database = Database(tmp_path / "app.db", migrations_dir=migrations)
    await database.initialize()
    (migrations / "0001_broken.sql").write_text(
        "CREATE TABLE transient (id INTEGER PRIMARY KEY);\nINSERT INTO missing_table (id) VALUES (1);",
        encoding="utf-8",
    )

    with pytest.raises(DatabaseError, match="Migration 0001_broken.sql failed"):
        await database.migrate()

    async with database.connect() as connection:
        cursor = await connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transient'")
        assert await cursor.fetchone() is None
        cursor = await connection.execute("SELECT COUNT(*) AS count FROM schema_migrations")
        assert (await cursor.fetchone())["count"] == 0


@pytest.mark.asyncio
async def test_database_enables_foreign_keys_and_busy_timeout(tmp_path: Path) -> None:
    database = Database(tmp_path / "app.db")
    await database.initialize()
    async with database.connect() as connection:
        foreign_keys = await (await connection.execute("PRAGMA foreign_keys")).fetchone()
        busy_timeout = await (await connection.execute("PRAGMA busy_timeout")).fetchone()

    assert foreign_keys[0] == 1
    assert busy_timeout[0] == 5000


@pytest.mark.asyncio
async def test_sqlite_errors_are_wrapped_without_suppressing_cause(tmp_path: Path) -> None:
    migrations = tmp_path / "migrations"
    migrations.mkdir()
    (migrations / "0001_invalid.sql").write_text("INVALID SQL;", encoding="utf-8")
    database = Database(tmp_path / "app.db", migrations_dir=migrations)

    with pytest.raises(DatabaseError) as error:
        await database.initialize()

    assert isinstance(error.value.__cause__, aiosqlite.Error)
