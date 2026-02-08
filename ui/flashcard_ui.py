import streamlit as st
import uuid


def render_flashcards(flashcards):
    st.markdown("## 🃏 Flashcards")

    _inject_css()

    cols = st.columns(3)  # 3 cards / row
    for i, card in enumerate(flashcards):
        with cols[i % 3]:
            _flashcard(card)


def _flashcard(card):
    card_id = uuid.uuid4().hex

    html = f"""
    <div class="flashcard-container">
      <div class="flashcard" id="{card_id}">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <h4>❓ Question</h4>
            <p>{card['question']}</p>
          </div>
          <div class="flashcard-back">
            <h4>✅ Answer</h4>
            <p>{card['answer']}</p>
            <span class="page">📄 Page {card['page']}</span>
          </div>
        </div>
      </div>
    </div>
    """

    st.components.v1.html(html, height=260)


def _inject_css():
    st.markdown(
        """
        <style>
        .flashcard-container {
            perspective: 1000px;
        }

        .flashcard {
            width: 100%;
            height: 240px;
            cursor: pointer;
        }

        .flashcard-inner {
            position: relative;
            width: 100%;
            height: 100%;
            text-align: center;
            transition: transform 0.6s;
            transform-style: preserve-3d;
        }

        .flashcard:hover .flashcard-inner {
            transform: rotateY(180deg);
        }

        .flashcard-front,
        .flashcard-back {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .flashcard-front {
            background: linear-gradient(135deg, #4facfe, #00f2fe);
            color: white;
        }

        .flashcard-back {
            background: linear-gradient(135deg, #43e97b, #38f9d7);
            color: #0f172a;
            transform: rotateY(180deg);
        }

        .flashcard h4 {
            margin-bottom: 10px;
        }

        .page {
            margin-top: 10px;
            font-size: 0.8rem;
            opacity: 0.8;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
