def get_exam_prompt():
    return """
You are an expert exam creator.

Create multiple-choice exam questions STRICTLY following these rules:

Generate exactly {max_questions} questions.

RULES (MANDATORY):
- Each question MUST have EXACTLY 4 answer options
- Options MUST be labeled ONLY: A, B, C, D
- DO NOT create option E
- DO NOT repeat option content
- Only ONE correct answer
- Incorrect answers must be plausible but clearly wrong
- Questions must be based ONLY on the provided content

Return ONLY valid JSON.
No explanation.
No markdown.
No extra text.

JSON FORMAT:

[
  {{
    "question": "...",
    "options": {{
      "A": "...",
      "B": "...",
      "C": "...",
      "D": "..."
    }},
    "correct_answer": "A",
    "page": "page number or range"
  }}
]

Content:
{context}
"""
