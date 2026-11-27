"""Disk-backed embedding cache keyed by chunk checksum.

Ingest used to re-embed the entire corpus on every upload. Chunk checksums are
already deterministic (``fingerprint_text``), so a persistent cache turns a
re-ingest of unchanged content into zero provider calls, and a full boot rebuild
into one provider call per genuinely new chunk.
"""

from __future__ import annotations

import sqlite3
import threading
from array import array
from collections.abc import Iterable, Sequence
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS embeddings (
    cache_key TEXT PRIMARY KEY,
    namespace TEXT NOT NULL,
    dimension INTEGER NOT NULL,
    vector BLOB NOT NULL
)
"""


class EmbeddingCache:
    def __init__(self, path: str | Path, *, namespace: str, enabled: bool = True) -> None:
        self.path = Path(path)
        self.namespace = namespace
        self.enabled = enabled
        self._lock = threading.Lock()
        self._connection: sqlite3.Connection | None = None
        if self.enabled:
            self._connect()

    def _connect(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(str(self.path), check_same_thread=False, timeout=30)
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute(_SCHEMA)
        connection.commit()
        self._connection = connection

    def make_key(self, checksum: str) -> str:
        return f"{self.namespace}:{checksum}"

    def get_many(self, checksums: Sequence[str]) -> dict[str, list[float]]:
        """Return cached vectors keyed by chunk checksum, skipping cache misses."""
        if not self.enabled or self._connection is None or not checksums:
            return {}
        unique = list(dict.fromkeys(checksums))
        keys = [self.make_key(checksum) for checksum in unique]
        cached: dict[str, list[float]] = {}
        with self._lock:
            for start in range(0, len(keys), 500):
                batch = keys[start : start + 500]
                placeholders = ",".join("?" for _ in batch)
                rows = self._connection.execute(
                    f"SELECT cache_key, vector FROM embeddings WHERE cache_key IN ({placeholders})",
                    batch,
                ).fetchall()
                for cache_key, blob in rows:
                    checksum = cache_key[len(self.namespace) + 1 :]
                    vector = array("d")
                    vector.frombytes(blob)
                    cached[checksum] = list(vector)
        return cached

    def put_many(self, items: Iterable[tuple[str, Sequence[float]]]) -> None:
        """Persist ``(checksum, vector)`` pairs; later duplicates win."""
        if not self.enabled or self._connection is None:
            return
        rows = [
            (self.make_key(checksum), self.namespace, len(vector), array("d", vector).tobytes())
            for checksum, vector in items
        ]
        if not rows:
            return
        with self._lock:
            self._connection.executemany(
                "INSERT OR REPLACE INTO embeddings (cache_key, namespace, dimension, vector) VALUES (?, ?, ?, ?)",
                rows,
            )
            self._connection.commit()

    def count(self) -> int:
        if not self.enabled or self._connection is None:
            return 0
        with self._lock:
            row = self._connection.execute(
                "SELECT COUNT(*) FROM embeddings WHERE namespace = ?",
                (self.namespace,),
            ).fetchone()
        return int(row[0]) if row is not None else 0

    def close(self) -> None:
        if self._connection is None:
            return
        with self._lock:
            self._connection.close()
            self._connection = None


__all__ = ["EmbeddingCache"]
