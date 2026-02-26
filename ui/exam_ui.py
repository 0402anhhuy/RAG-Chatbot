import streamlit as st

from typing import Dict, List


"""
Tạo danh sách các câu hỏi (questions: List[Dict]) với cấu trúc:
questions = [
    {
        "question": "What is the capital of France?",
        "options": {
            "A": "Berlin",
            "B": "Madrid",
            "C": "Paris",
            "D": "Rome"
        },
        "correct_answer": "C",
        "page": 5
    }
]
"""
def render_exam(questions: List[Dict]) -> None:
    score = 0
    user_answers = {}

    """
    Hàm enumerate(questions) → Tạo một iterator (i, q)
    - i: index của câu hỏi (0, 1, 2, ...)
    - q: dictionary chứa thông tin câu hỏi (question, options, correct_answer, page)
    """
    for i, q in enumerate(questions):
        st.markdown(f"### Q{i + 1}. {q['question']}")

        # Tạo dict các lựa chọn từ q["options"] → options = {"A": "Berlin", "B": "Madrid", "C": "Paris", "D": "Rome"}
        options = q["options"]
        choice = st.radio(
            label="Choose one:",
            options=["", "A", "B", "C", "D"],
            format_func=lambda k: "— Select an answer —" if k == "" else f"{k}. {options[k]}",
            key=f"exam_{i}"
        )

        user_answers[i] = choice
        st.caption(f"📄 Source page: {q.get('page', 'N/A')}")

        st.markdown("---")

    if st.button("Submit Exam"):
        for i, q in enumerate(questions):
            if user_answers.get(i) == "":
                continue
            if user_answers.get(i) == q["correct_answer"]:
                score += 1

        st.success(f"Your score: {score} / {len(questions)}")

        with st.expander("Review Answers"):
            for i, q in enumerate(questions):
                st.markdown(
                    f"**Q{i + 1}: {q['question']} - Correct answer: {q['correct_answer']}**")
