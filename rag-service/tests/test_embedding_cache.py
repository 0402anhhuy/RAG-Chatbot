from __future__ import annotations

from app.rag.embedding_cache import EmbeddingCache


def test_roundtrip_and_persistence(tmp_path) -> None:
    path = tmp_path / "cache.sqlite3"
    cache = EmbeddingCache(path, namespace="dummy:model:True:3")
    cache.put_many([("checksum-1", [0.1, 0.2, 0.3])])

    assert cache.get_many(["checksum-1", "missing"]) == {"checksum-1": [0.1, 0.2, 0.3]}
    assert cache.count() == 1
    cache.close()

    reopened = EmbeddingCache(path, namespace="dummy:model:True:3")
    assert reopened.get_many(["checksum-1"]) == {"checksum-1": [0.1, 0.2, 0.3]}
    reopened.close()


def test_namespace_isolates_models(tmp_path) -> None:
    path = tmp_path / "cache.sqlite3"
    first = EmbeddingCache(path, namespace="provider-a:model:True:3")
    second = EmbeddingCache(path, namespace="provider-b:model:True:3")
    first.put_many([("checksum-1", [1.0, 0.0, 0.0])])

    assert second.get_many(["checksum-1"]) == {}
    first.close()
    second.close()


def test_disabled_cache_is_a_noop(tmp_path) -> None:
    cache = EmbeddingCache(tmp_path / "cache.sqlite3", namespace="ns", enabled=False)

    cache.put_many([("checksum-1", [1.0])])

    assert cache.get_many(["checksum-1"]) == {}
    assert cache.count() == 0
