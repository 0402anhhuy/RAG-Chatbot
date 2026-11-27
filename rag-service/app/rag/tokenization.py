"""Token counting and token-aware text utilities.

The default counter is a deterministic heuristic (words + punctuation), which is
close enough for chunk budgeting and works without downloading a model. When
``tiktoken`` is installed it can be selected explicitly.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Protocol

_TOKEN_PATTERN = re.compile(r"\w+|[^\w\s]", re.UNICODE)


class TokenCounter(Protocol):
    name: str

    def count(self, text: str) -> int: ...


class HeuristicTokenCounter:
    name = "heuristic"

    def count(self, text: str) -> int:
        return len(_TOKEN_PATTERN.findall(text or ""))


class TiktokenTokenCounter:
    name = "tiktoken"

    def __init__(self, model: str = "cl100k_base") -> None:
        import tiktoken

        self._encoder = tiktoken.get_encoding(model)

    def count(self, text: str) -> int:
        return len(self._encoder.encode(text or ""))


@lru_cache(maxsize=4)
def create_token_counter(name: str = "heuristic", *, model: str | None = None) -> TokenCounter:
    normalized = (name or "heuristic").lower()
    if normalized == "tiktoken":
        try:
            return TiktokenTokenCounter(model or "cl100k_base")
        except (ImportError, ValueError):
            return HeuristicTokenCounter()
    return HeuristicTokenCounter()


def count_tokens(text: str, *, counter: TokenCounter | None = None) -> int:
    return (counter or HeuristicTokenCounter()).count(text)


__all__ = [
    "HeuristicTokenCounter",
    "TiktokenTokenCounter",
    "TokenCounter",
    "count_tokens",
    "create_token_counter",
]
