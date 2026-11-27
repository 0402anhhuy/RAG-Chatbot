"""Deterministic lexical embedding used by the offline evaluator."""

from __future__ import annotations

import hashlib
import math
from collections.abc import Sequence

from app.rag.retrievers.text_processing import tokenize_text


class HashingEmbeddingModel:
    model_name = "eval-hashing"
    dimension = 256

    def _vector(self, text: str) -> list[float]:
        vector = [0.0] * self.dimension
        for token in tokenize_text(text, expand_compounds=False, remove_stopwords=True):
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            index = int.from_bytes(digest, "big") % self.dimension
            vector[index] += 1.0
        norm = math.sqrt(sum(value * value for value in vector))
        if norm > 0:
            vector = [value / norm for value in vector]
        return vector

    def embed_query(self, text: str) -> list[float]:
        return self._vector(text)

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._vector(text) for text in texts]


__all__ = ["HashingEmbeddingModel"]
