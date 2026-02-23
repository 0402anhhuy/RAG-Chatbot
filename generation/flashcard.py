import json
import re
from typing import List, Dict

from prompt.prompt_flashcard import get_flashcard_prompt

"""
---------------- Extract JSON ----------------
LLM có thể trả về JSON được bao quanh bởi markdown
"""
def _extract_json(text: str) -> str | None:
    # Loại bỏ markdown code nếu có
    text = text.strip()
    text = re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()

    match = re.search(r"\[\s*{.*}\s*\]", text, re.DOTALL)
    if match:
        return match.group(0)

    return None


"""
---------------- Main API ----------------
- Hàm generate_flashcards() được gọi từ app.py để tạo flashcard từ toàn bộ document
    Args:
        llm: Mô hình LLM
        chunks: Toàn bộ nội dung sau khi chunk (List[Dict])
        max_chunks: số lượng chunk tối đa để đưa vào prompt (giới hạn context)

    Returns:
        List of validated flashcards
"""
def generate_flashcards(llm: any, chunks: List[Dict], max_chunks: int = 20) -> List[Dict]:
    prompt = get_flashcard_prompt()

    selected_chunks = chunks[:max_chunks]

    # Gộp nội dung từ các chunk đã chọn thành một string lớn để đưa vào prompt
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

    # Kiểm tra cấu trúc các flashcard có đủ question, answer, page
    valid_cards = []
    for card in flashcards:
        if all(k in card for k in ("question", "answer", "page")):
            valid_cards.append(card)

    if not valid_cards:
        raise ValueError("Parsed JSON but no valid flashcards found.")

    return valid_cards
