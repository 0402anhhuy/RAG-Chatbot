"""Persistent BM25 index backed by a JSONL snapshot."""

from __future__ import annotations

import json
import math
import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from app.rag.types import DocumentChunk

_TOKEN_PATTERN = re.compile(r"\b\w+\b")


class BM25Index:
    def __init__(self, persist_path: str | Path, *, rebuild_on_boot: bool = True) -> None:
        self.persist_path = Path(persist_path)
        self.rebuild_on_boot = rebuild_on_boot
        self._documents: dict[str, dict[str, Any]] = {}
        self._idf: dict[str, float] = {}
        self._avgdl = 0.0

    def load(self) -> dict[str, dict[str, Any]]:
        self.persist_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.persist_path.exists():
            self._documents = {}
            self._idf = {}
            self._avgdl = 0.0
            return self._documents

        raw_documents: dict[str, dict[str, Any]] = {}
        with self.persist_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                payload = json.loads(line)
                raw_documents[payload["chunk_id"]] = payload
        self._documents = raw_documents
        self._recompute_idf()
        return self._documents

    def save(self) -> None:
        self.persist_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.persist_path.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as handle:
            for payload in self._documents.values():
                handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
        tmp_path.replace(self.persist_path)

    def index_documents(self, documents: list[DocumentChunk] | list[dict[str, Any]]) -> None:
        serialized: dict[str, dict[str, Any]] = {}
        for document in documents:
            if isinstance(document, DocumentChunk):
                chunk_id = document.chunk_id
                text = document.content
                metadata = document.metadata
            else:
                chunk_id = str(document["chunk_id"])
                text = str(document.get("content") or document.get("text", ""))
                metadata = dict(document.get("metadata", {}))
            tokens = self._tokenize(text)
            serialized[chunk_id] = {
                "chunk_id": chunk_id,
                "document_id": str(
                    document.document_id if isinstance(document, DocumentChunk) else document.get("document_id", "")
                ),
                "content": text,
                "tokens": tokens,
                "metadata": metadata,
            }
        self._documents = serialized
        self._recompute_idf()
        self.save()

    def search(
        self,
        query: str,
        *,
        top_k: int = 5,
        filters: Mapping[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        if not self._documents:
            return []
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        results: list[dict[str, Any]] = []
        for chunk in self._documents.values():
            if not chunk.get("tokens"):
                continue
            metadata = chunk.get("metadata", {})
            if filters and any(
                metadata.get(key) not in value
                if isinstance(value, (list, tuple, set, frozenset))
                else metadata.get(key) != value
                for key, value in filters.items()
            ):
                continue
            tokens = chunk["tokens"]
            frequency = {token: tokens.count(token) for token in set(tokens)}
            score = 0.0
            for token in set(query_tokens):
                tf = frequency.get(token, 0)
                if tf == 0:
                    continue
                idf = self._idf.get(token, 0.0)
                doc_length = len(tokens)
                numerator = tf * (1.5 + 1.0)
                denominator = tf + 1.5 * (1.0 - 0.75 + 0.75 * (doc_length / max(self._avgdl, 1.0)))
                score += idf * (numerator / denominator)
            if score > 0:
                results.append(
                    {
                        "chunk_id": chunk["chunk_id"],
                        "document_id": chunk.get("document_id", ""),
                        "content": chunk.get("content", " ".join(tokens)),
                        "score": score,
                        "metadata": chunk.get("metadata", {}),
                    }
                )

        results.sort(key=lambda item: item["score"], reverse=True)
        return results[:top_k]

    def rebuild(self, documents: list[DocumentChunk] | list[dict[str, Any]]) -> None:
        self.index_documents(documents)

    def _recompute_idf(self) -> None:
        document_count = len(self._documents)
        if document_count == 0:
            self._idf = {}
            self._avgdl = 0.0
            return

        doc_frequency: dict[str, int] = {}
        total_tokens = 0
        for chunk in self._documents.values():
            tokens = chunk.get("tokens", [])
            total_tokens += len(tokens)
            for token in set(tokens):
                doc_frequency[token] = doc_frequency.get(token, 0) + 1

        self._avgdl = total_tokens / document_count
        self._idf = {
            token: math.log((document_count - df + 0.5) / (df + 0.5) + 1.0) for token, df in doc_frequency.items()
        }

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return [token.lower() for token in _TOKEN_PATTERN.findall(text)]
