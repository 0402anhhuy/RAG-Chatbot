# generation/flashcard.py

import json
import re
from typing import List, Dict

from generation.prompt_flashcard import get_flashcard_prompt


def _extract_json(text: str) -> str | None:
    """
    Extract JSON array from LLM output safely.
    """
    # Remove markdown fences
    text = text.strip()
    text = re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()

    # Try to extract JSON array
    match = re.search(r"\[\s*{.*}\s*\]", text, re.DOTALL)
    if match:
        return match.group(0)

    return None


def generate_flashcards(llm, chunks, max_chunks: int = 20) -> List[Dict]:
    """
    Generate flashcards from the whole document content.
    """
    prompt = get_flashcard_prompt()

    # Limit chunks to avoid context overflow
    selected_chunks = chunks[:max_chunks]

    context = "\n\n".join(
        f"(Page {c.metadata.get('page', 'N/A')}) {c.page_content}"
        for c in selected_chunks
    )

    response = llm.invoke(
        prompt.format(context=context)
    )

    raw_output = response.content

    json_text = _extract_json(raw_output)
    if not json_text:
        raise ValueError(
            "LLM did not return valid JSON for flashcards.\n\n"
            f"Raw output:\n{raw_output}"
        )

    try:
        flashcards = json.loads(json_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            "Failed to parse flashcard JSON.\n\n"
            f"Extracted JSON:\n{json_text}"
        ) from e

    # Validate structure
    valid_cards = []
    for card in flashcards:
        if all(k in card for k in ("question", "answer", "page")):
            valid_cards.append(card)

    if not valid_cards:
        raise ValueError("Parsed JSON but no valid flashcards found.")

    return valid_cards
