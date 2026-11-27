"""Vietnamese/English text normalization and tokenization for BM25."""

from __future__ import annotations

import re
import unicodedata

STOP_WORDS: frozenset[str] = frozenset(
    {
        # English
        "the", "and", "for", "with", "that", "this", "what", "which", "when", "where", "how",
        "why", "are", "was", "were", "does", "did", "you", "your", "from", "into", "about",
        "explain", "between", "difference", "using", "use", "used", "can", "could", "should",
        "would", "have", "has", "had", "not", "but", "its", "their", "there", "then", "than",
        "a", "an", "of", "to", "in", "on", "is", "it", "as", "at", "be", "or", "by", "we",
        # Vietnamese
        "và", "của", "cho", "với", "những", "các", "một", "trong", "khi", "nào", "gì", "là",
        "được", "hay", "thì", "mà", "có", "không", "hãy", "giải", "thích", "phân", "biệt",
        "tôi", "bạn", "chúng", "họ", "này", "đó", "để", "từ", "về", "theo", "như", "vì",
        "nên", "cũng", "rất", "nhưng", "hoặc", "nếu", "sẽ", "đã", "đang", "bị", "bởi",
    }
)
_TOKEN_PATTERN = re.compile(r"[^\W_]+", re.UNICODE)


def normalize_text(text: str, *, strip_diacritics: bool = False) -> str:
    normalized = unicodedata.normalize("NFC", (text or "").casefold())
    if not strip_diacritics:
        return normalized
    decomposed = unicodedata.normalize("NFD", normalized)
    without_marks = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return without_marks.replace("đ", "d").replace("Đ", "d")


def tokenize_text(
    text: str,
    *,
    strip_diacritics: bool = False,
    expand_compounds: bool = True,
    remove_stopwords: bool = True,
) -> list[str]:
    """Tokenize into words/syllables, optionally adding adjacent-word compounds.

    Vietnamese is syllable-spaced, so whitespace tokens already work for many
    queries; the ``a_b`` compound token improves phrase-ish matches ("học_máy").
    """
    normalized = normalize_text(text, strip_diacritics=strip_diacritics)
    tokens = [token for token in _TOKEN_PATTERN.findall(normalized) if token]
    if remove_stopwords:
        tokens = [token for token in tokens if token not in STOP_WORDS]
    if not expand_compounds or len(tokens) < 2:
        return tokens

    expanded: list[str] = []
    for index, token in enumerate(tokens):
        expanded.append(token)
        if index + 1 < len(tokens):
            following = tokens[index + 1]
            if len(token) > 1 and len(following) > 1 and token.isalpha() and following.isalpha():
                expanded.append(f"{token}_{following}")
    return expanded


__all__ = ["STOP_WORDS", "normalize_text", "tokenize_text"]
