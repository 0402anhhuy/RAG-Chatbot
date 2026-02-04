# generation/prompt_flashcard.py

def get_flashcard_prompt():
    return """
You are an expert teaching assistant.

From the content below, generate high-quality study flashcards.

Rules:
- Each flashcard must be useful for learning and revision
- Question should test understanding, not copy sentences
- Answer should be concise and factual
- Do NOT hallucinate information

Return the result strictly in valid JSON format:

[
  {{
    "question": "...",
    "answer": "...",
    "page": "page number or multiple"
  }}
]

Content:
{context}
"""
