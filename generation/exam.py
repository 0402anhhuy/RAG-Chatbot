import json
import random
from typing import List, Dict

from generation.prompt_exam import get_exam_prompt
from langchain_google_genai.chat_models import ChatGoogleGenerativeAIError


"""
---------------- Validation ----------------
Kiểm tra cấu trúc câu hỏi được JSON trả về có hợp lệ không:
- Phải có đúng 4 lựa chọn A → D (Options cũng là Dict)
- Không được trùng nội dung lựa chọn
- Chỉ có 1 đáp án đúng
"""
def _is_valid_question(q: Dict) -> bool:
    """
    Cấu trúc của q (câu hỏi) trong Dict:
    {
        "question": "Câu hỏi",
        "options": {
            "A": "Lựa chọn A",
            "B": "Lựa chọn B",
            "C": "Lựa chọn C",
            "D": "Lựa chọn D"
        },
        "correct_answer": "A"
    }
    """
    if not isinstance(q, dict):
        return False

    # Kiểm tra có đủ keys theo cấu trúc câu hỏi
    if "question" not in q or "options" not in q or "correct_answer" not in q:
        return False

    options = q["options"]

    # Có đúng 4 lựa chọn A → D
    if set(options.keys()) != {"A", "B", "C", "D"}:
        return False

    # Không có đáp án trùng lặp
    if len(set(options.values())) != 4:
        return False

    # Đáp án đúng thuộc A → D
    if q["correct_answer"] not in {"A", "B", "C", "D"}:
        return False

    return True


"""
---------------- Shuffle options ----------------
Trộn thứ tự các đáp án sau khi câu hỏi đã hợp lệ
"""
def _shuffle_options(q: Dict) -> Dict:
    # Tạo một list các cặp (key, value) từ options → truyền vào random.shuffle() để sắp xếp ngẫu nhiên
    options_items = list(q["options"].items())
    random.shuffle(options_items)

    correct_value = q["options"][q["correct_answer"]]

    new_options = {}
    new_correct = None

    # Cú pháp enumerate(...) trả ra cặp (idx, item(key, value))
    for idx, (_, value) in enumerate(options_items):
        # Tạo lại key mới dựa trên idx (0 → A, 1 → B, ...) (ord("A") → mã ASCII của "A" (65))
        key = chr(ord("A") + idx)
        new_options[key] = value
        if value == correct_value:
            new_correct = key

    q["options"] = new_options
    q["correct_answer"] = new_correct
    return q


"""
---------------- Main API ----------------
- Hàm generate_exam_questions() được gọi từ app.py để tạo exam từ toàn bộ document
    Args:
        llm: Mô hình LLM
        chunks: Toàn bộ nội dung sau khi chunk (List[Document])
        max_questions: số lượng câu hỏi
        max_retries: số lần thử lại nếu LLM trả về lỗi hoặc JSON không hợp lệ

    Returns:
        List of validated exam questions
"""
def generate_exam_questions( 
    llm,
    chunks,
    *,
    max_questions: int = 10,
    max_retries: int = 2
) -> List[Dict]:
    
    # Gộp nội dung từ tất cả chunks thành một string lớn để đưa vào prompt
    context = "\n\n".join(
        f"[Page {c.metadata.get('page', 'N/A')}]\n{c.page_content}"
        for c in chunks
    )

    prompt = get_exam_prompt()

    for attempt in range(max_retries + 1):
        try:
            response = llm.invoke(
                prompt.format(
                    context=context,
                    max_questions=max_questions
                )
            )

            raw_text = response.content.strip()


            try:
                parsed = json.loads(raw_text)
            except json.JSONDecodeError:
                if attempt < max_retries:
                    continue
                raise ValueError("LLM did not return valid JSON for exam questions")

            valid_questions = []

            for q in parsed:
                if _is_valid_question(q):
                    q = _shuffle_options(q)
                    valid_questions.append(q)

            if not valid_questions:
                raise ValueError("No valid exam questions generated")

            return valid_questions

        except ChatGoogleGenerativeAIError as e:
            if attempt < max_retries:
                continue
            raise e

    raise RuntimeError("Failed to generate exam questions after retries")