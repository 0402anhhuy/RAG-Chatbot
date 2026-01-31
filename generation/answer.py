import re
import time

from langchain_google_genai.chat_models import ChatGoogleGenerativeAIError


def _extract_retry_seconds(message: str) -> float | None:
    match = re.search(r"retry in\s+([0-9.]+)s", message, flags=re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def generate_answer(llm, prompt, context, question, *, max_retries: int = 2):
    chain = prompt | llm

    for attempt in range(max_retries + 1):
        try:
            response = chain.invoke({
                "context": context,
                "question": question
            })
            return response.content
        except ChatGoogleGenerativeAIError as e:
            msg = str(e)

            # Hard-quota exhausted (often shows limit: 0) -> retries won't help.
            if "RESOURCE_EXHAUSTED" in msg and "limit: 0" in msg:
                raise ChatGoogleGenerativeAIError(
                    "Gemini API bị hết quota (429 RESOURCE_EXHAUSTED, limit=0). "
                    "Cách xử lý: bật Billing/upgrade plan trên Google AI Studio hoặc đổi model "
                    "(gợi ý: set CHAT_MODEL=gemini-1.5-flash)."
                ) from e

            # Transient rate limit -> respect suggested backoff if present.
            retry_s = _extract_retry_seconds(msg)
            if (
                "RESOURCE_EXHAUSTED" in msg
                and retry_s is not None
                and attempt < max_retries
            ):
                time.sleep(max(0.5, retry_s))
                continue

            raise
