import streamlit as st
import tempfile
import os

from langchain_google_genai import ChatGoogleGenerativeAI

from loaders.pdf_loader import load_pdfs_from_dir
from domain.chunking import chunk_documents
from retrieval.retriever import build_vectorstore, get_retriever
from generation.prompt import get_rag_prompt
from generation.answer import generate_answer
from generation.flashcard import generate_flashcards

from utils.config import CHAT_MODEL, GOOGLE_API_KEY


# ---------------- Page Config ----------------
st.set_page_config(
    page_title="RAG PDF Study App",
    layout="wide"
)

# ---------------- Session State ----------------
if "chunks" not in st.session_state:
    st.session_state.chunks = []

if "retriever" not in st.session_state:
    st.session_state.retriever = None

if "flashcards" not in st.session_state:
    st.session_state.flashcards = []


# ---------------- Sidebar ----------------
st.sidebar.title("📂 Dashboard")

uploaded_file = st.sidebar.file_uploader(
    "Upload a PDF file",
    type=["pdf"]
)

generate_flashcard_btn = st.sidebar.button("🃏 Generate Flashcards")


# ---------------- Main UI ----------------
st.title("📘 RAG PDF Study Assistant")
st.caption("Chat with your PDF or study using flashcards")


# ---------------- Load & Index PDF ----------------
if uploaded_file:
    with st.spinner("Processing PDF..."):
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, uploaded_file.name)
            with open(pdf_path, "wb") as f:
                f.write(uploaded_file.read())

            documents = load_pdfs_from_dir(tmpdir)
            chunks = chunk_documents(documents)

            vectorstore = build_vectorstore(chunks)
            retriever = get_retriever(vectorstore)

            st.session_state.chunks = chunks
            st.session_state.retriever = retriever

    st.success("✅ PDF indexed successfully!")


# ---------------- LLM ----------------
llm = ChatGoogleGenerativeAI(
    model=CHAT_MODEL,
    google_api_key=GOOGLE_API_KEY,
    temperature=0.3
)


# ---------------- Flashcard Generation ----------------
if generate_flashcard_btn:
    if not st.session_state.chunks:
        st.warning("Please upload a PDF first.")
    else:
        with st.spinner("Generating flashcards from entire document..."):
            flashcards = generate_flashcards(
                llm=llm,
                chunks=st.session_state.chunks
            )

            st.session_state.flashcards = flashcards

        st.success(f"🃏 Created {len(flashcards)} flashcards!")


# ---------------- Flashcard UI ----------------
if st.session_state.flashcards:
    st.markdown("## 🃏 Flashcards")

    for i, card in enumerate(st.session_state.flashcards):
        with st.expander(f"{i+1}. {card['question']}"):
            st.markdown(card["answer"])
            st.caption(f"📄 Source page: {card.get('page', 'N/A')}")


# ---------------- Chat Section ----------------
st.markdown("---")
st.markdown("## 💬 Ask Questions")

question = st.text_input("Ask a question about the document")

if question and st.session_state.retriever:
    with st.spinner("Thinking..."):
        docs = st.session_state.retriever.invoke(question)
        context = "\n\n".join(d.page_content for d in docs)

        answer = generate_answer(
            llm=llm,
            prompt=get_rag_prompt(),
            context=context,
            question=question
        )

    st.markdown("### 🤖 Answer")
    st.write(answer)

    pages = sorted(set(d.metadata.get("page", "N/A") for d in docs))
    st.caption(f"📚 Sources: pages {pages}")
