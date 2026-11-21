"""Every relative link in the documentation index must resolve.

This keeps the index from pointing at missing or renamed runbooks.
"""

from __future__ import annotations

import re
from pathlib import Path

DOCS_DIR = Path(__file__).resolve().parents[1] / "docs"
INDEX = DOCS_DIR / "index.md"
LINK_PATTERN = re.compile(r"\]\(([^)#]+?)(?:#[^)]*)?\)")


def test_documentation_index_links_resolve() -> None:
    text = INDEX.read_text(encoding="utf-8")
    missing = [target for target in LINK_PATTERN.findall(text) if not (DOCS_DIR / target).exists()]

    assert not missing, missing


def test_all_docs_markdown_links_resolve() -> None:
    missing: list[str] = []
    for page in DOCS_DIR.rglob("*.md"):
        for target in LINK_PATTERN.findall(page.read_text(encoding="utf-8")):
            if target.startswith(("http://", "https://", "mailto:")):
                continue
            if not (page.parent / target).resolve().exists():
                missing.append(f"{page.relative_to(DOCS_DIR).as_posix()} -> {target}")

    assert not missing, missing
