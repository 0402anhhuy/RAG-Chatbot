import streamlit as st


def render_exam(questions):
    st.markdown("## 📝 Exam Mode")

    score = 0
    user_answers = {}

    for i, q in enumerate(questions):
        st.markdown(f"### Q{i + 1}. {q['question']}")

        options = q["options"]
        choice = st.radio(
            "Choose one:",
            ["", "A", "B", "C", "D"],
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

        st.success(f"🎯 Your score: {score} / {len(questions)}")

        with st.expander("📘 Review Answers"):
            for i, q in enumerate(questions):
                st.markdown(f"**Q{i+1}: {q['question']}**")
                st.markdown(f"*Correct answer: {q['correct_answer']}*")
