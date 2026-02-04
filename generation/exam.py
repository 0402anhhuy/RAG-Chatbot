import json
import random
from typing import List, Dict

from generation.prompt_exam import get_exam_prompt
from langchain_google_genai.chat_models import ChatGoogleGenerativeAIError


# ---------------- Validation ----------------
def _is_valid_question(q: Dict) -> bool:
    """
    Validate a single exam question structure
    """
    if not isinstance(q, dict):
        return False

    if "question" not in q or "options" not in q or "correct_answer" not in q:
        return False

    options = q["options"]

    # Must be exactly A–D
    if set(options.keys()) != {"A", "B", "C", "D"}:
        return False

    # No duplicated option content
    if len(set(options.values())) != 4:
        return False

    # Correct answer must be one of A–D
    if q["correct_answer"] not in {"A", "B", "C", "D"}:
        return False

    return True


# ---------------- Shuffle options safely ----------------
def _shuffle_options(q: Dict) -> Dict:
    """
    Shuffle answer options while keeping correct answer mapping
    """
    options_items = list(q["options"].items())
    random.shuffle(options_items)

    correct_value = q["options"][q["correct_answer"]]

    new_options = {}
    new_correct = None

    for idx, (_, value) in enumerate(options_items):
        key = chr(ord("A") + idx)
        new_options[key] = value
        if value == correct_value:
            new_correct = key

    q["options"] = new_options
    q["correct_answer"] = new_correct
    return q


# ---------------- Main API ----------------
def generate_exam_questions(
    llm,
    chunks,
    *,
    max_questions: int = 10,
    max_retries: int = 2,
) -> List[Dict]:
    """
    Generate multiple-choice exam questions from the entire document

    Args:
        llm: ChatGoogleGenerativeAI
        chunks: list of Document
        max_questions: desired number of questions
        max_retries: retry LLM if JSON is invalid

    Returns:
        List of validated exam questions
    """
    # Merge all content
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
