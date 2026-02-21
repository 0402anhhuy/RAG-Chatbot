import streamlit as st


def render_flashcards(flashcards):
    st.markdown("### Flashcards")

    if not flashcards:
        st.info("No flashcards to display.")
        return

    for i, card in enumerate(flashcards):
        st.markdown(f"{card['question']}")

        with st.expander("Show answer"):
            st.markdown(card.get("answer", ""))

        st.caption(f"📄 Source page: {card.get('page', 'N/A')}")
