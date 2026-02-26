import streamlit as st

from typing import Dict, List


def render_flashcards(flashcards: List[Dict]) -> None:
    for _, card in enumerate(flashcards):
        st.markdown(f"{card['question']}")

        with st.expander("Show answer"):
            st.markdown(card.get("answer", ""))

        st.caption(f"📄 Source page: {card.get('page', 'N/A')}")
