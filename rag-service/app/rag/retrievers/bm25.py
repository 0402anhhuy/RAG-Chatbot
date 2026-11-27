"""Persistent BM25 index backed by a JSONL snapshot."""

from __future__ import annotations

import json
import math
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from app.rag.retrievers.text_processing import tokenize_text
from app.rag.types import DocumentChunk


class BM25Index:
    def __init__(
        self,
        persist_path: str | Path,
        *,
        rebuild_on_boot: bool = True,
        strip_diacritics: bool = False,
        expand_compounds: bool = True,
        index_version: str = "chunk-v2",
    ) -> None:
        self.persist_path = Path(persist_path)
        self.rebuild_on_boot = rebuild_on_boot
        self.strip_diacritics = strip_diacritics
        self.expand_compounds = expand_compounds
        self.configured_version = index_version
        self.version: str | None = None
        self._documents: dict[str, dict[str, Any]] = {}
        self._idf: dict[str, float] = {}
        self._avgdl = 0.0

    def load(self) -> dict[str, dict[str, Any]]:
        self.persist_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.persist_path.exists():
            self._documents = {}
            self._idf = {}
            self._avgdl = 0.0
            self.version = None
            return self._documents

        raw_documents: dict[str, dict[str, Any]] = {}
        with self.persist_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                payload = json.loads(line)
                raw_documents[payload["chunk_id"]] = payload
        self._documents = raw_documents
        first = next(iter(raw_documents.values()), None)
        self.version = str(first.get("index_version")) if first and first.get("index_version") else None
        self._recompute_idf()
        return self._documents

    def save(self) -> None:
        self.persist_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.persist_path.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as handle:
            for payload in self._documents.values():
                handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
        tmp_path.replace(self.persist_path)

    def _serialize(self, document: DocumentChunk | dict[str, Any]) -> dict[str, Any]:
        if isinstance(document, DocumentChunk):
            chunk_id = document.chunk_id
            text = document.content
            metadata = document.metadata
            document_id = document.document_id
        else:
            chunk_id = str(document["chunk_id"])
            text = str(document.get("content") or document.get("text", ""))
            metadata = dict(document.get("metadata", {}))
            document_id = str(document.get("document_id", ""))
        return {
            "chunk_id": chunk_id,
            "document_id": document_id,
            "content": text,
            "tokens": self._tokenize(text),
            "metadata": metadata,
            "index_version": metadata.get("index_version") or self.configured_version,
        }

    def index_documents(self, documents: list[DocumentChunk] | list[dict[str, Any]]) -> None:
        """Replace the whole corpus (used by the boot rebuild)."""
        self._documents = {payload["chunk_id"]: payload for payload in map(self._serialize, documents)}
        first = next(iter(self._documents.values()), None)
        self.version = str(first["index_version"]) if first else self.configured_version
        self._recompute_idf()
        self.save()

    def upsert_documents(self, documents: list[DocumentChunk] | list[dict[str, Any]]) -> None:
        """Merge a document's chunks into the corpus without touching other documents."""
        for document in documents:
            payload = self._serialize(document)
            self._documents[payload["chunk_id"]] = payload
        first = next(iter(self._documents.values()), None)
        self.version = str(first["index_version"]) if first else self.configured_version
        self._recompute_idf()
        self.save()

    def replace_document(self, document_id: str, documents: list[DocumentChunk] | list[dict[str, Any]]) -> None:
        """Replace just one document's chunks in a single write."""
        self._documents = {
            chunk_id: payload
            for chunk_id, payload in self._documents.items()
            if str(payload.get("document_id", "")) != document_id
        }
        for document in documents:
            payload = self._serialize(document)
            self._documents[payload["chunk_id"]] = payload
        first = next(iter(self._documents.values()), None)
        self.version = str(first["index_version"]) if first else self.configured_version
        self._recompute_idf()
        self.save()

    def delete_by_document(self, document_id: str) -> int:
        """Remove every chunk belonging to a document and return how many were removed."""
        stale = [
            chunk_id
            for chunk_id, payload in self._documents.items()
            if str(payload.get("document_id", "")) == document_id
        ]
        for chunk_id in stale:
            del self._documents[chunk_id]
        if stale:
            self._recompute_idf()
            self.save()
        return len(stale)

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

    def _tokenize(self, text: str) -> list[str]:
        return tokenize_text(
            text,
            strip_diacritics=self.strip_diacritics,
            expand_compounds=self.expand_compounds,
        )
