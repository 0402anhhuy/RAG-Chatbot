import streamlit as st
import tempfile
import os

from langchain_google_genai import ChatGoogleGenerativeAI

from loaders.pdf_loader import load_pdfs_from_dir
from domain.chunking import chunk_documents
from retrieval.retriever import build_vectorstore, get_retriever, retrieve_with_threshold, build_context
from generation.prompt import get_rag_prompt
from generation.answer import generate_answer
from generation.flashcard import generate_flashcards
from generation.exam import generate_exam_questions
from ui.exam_ui import render_exam


# ---------------- Page Config ----------------
st.set_page_config(
    page_title="RAG PDF Study App",
    layout="wide"
)

# ---------------- Session State ----------------
if "pdf_processed" not in st.session_state:
    st.session_state.pdf_processed = False

if "last_uploaded_file" not in st.session_state:
    st.session_state.last_uploaded_file = None

if "chunks" not in st.session_state:
    st.session_state.chunks = []

if "vectorstore" not in st.session_state:
    st.session_state.vectorstore = None

if "retriever" not in st.session_state:
    st.session_state.retriever = None

if "flashcards" not in st.session_state:
    st.session_state.flashcards = []

if "exam_questions" not in st.session_state:
    st.session_state.exam_questions = []


# ---------------- Sidebar ----------------
st.title("RAG PDF Study App")

with st.sidebar:
    st.markdown("## PDF Workspace")

    uploaded_file = st.file_uploader(
        "Upload a PDF file",
        type=["pdf"],
        label_visibility="collapsed"
    )

    # --- LOGIC THÔNG MINH VỚI TOAST ---
    if uploaded_file is not None:
        if uploaded_file.name != st.session_state.last_uploaded_file:
            if st.session_state.last_uploaded_file is not None:
                st.toast(
                    f":blue[**NOTICE**]: Detected new file: {uploaded_file.name}", duration='long')
            st.session_state.pdf_processed = False
    else:
        st.session_state.pdf_processed = False
        st.session_state.last_uploaded_file = None

    st.markdown("---")
    st.markdown("## Document")

    process_pdf_btn = st.button(
        "Process PDF",
        use_container_width=True,
        disabled=(uploaded_file is None or st.session_state.pdf_processed)
    )

    st.markdown("---")
    st.markdown("## Study Modes")

    col1, col2 = st.columns(2)

    with col1:
        generate_flashcard_btn = st.button(
            "Flashcards",
            use_container_width=True,
            disabled=not st.session_state.pdf_processed
        )

    with col2:
        generate_exam_btn = st.button(
            "Exam",
            use_container_width=True,
            disabled=not st.session_state.pdf_processed
        )

    st.markdown("---")

    if st.button("Reset", use_container_width=True):
        for key in ["pdf_processed", "last_uploaded_file", "chunks", "vectorstore", "retriever", "flashcards", "exam_questions"]:
            st.session_state.pop(key, None)
        st.rerun()


# ---------------- Load & Index PDF ----------------
if process_pdf_btn:
    if not uploaded_file:
        st.toast(
            ":yellow:[**NOTICE**]: Please upload a PDF first", duration='short')
    else:
        with st.spinner("Processing PDF..."):
            with tempfile.TemporaryDirectory() as tmpdir:
                pdf_path = os.path.join(tmpdir, uploaded_file.name)
                with open(pdf_path, "wb") as f:
                    f.write(uploaded_file.read())

                documents = load_pdfs_from_dir(tmpdir)
                chunks = chunk_documents(documents)

                vectorstore = build_vectorstore(chunks)
                retriever = get_retriever(vectorstore)

                # CẬP NHẬT STATE
                st.session_state.chunks = chunks
                st.session_state.vectorstore = vectorstore
                st.session_state.retriever = retriever
                st.session_state.last_uploaded_file = uploaded_file.name
                st.session_state.pdf_processed = True

                st.session_state.flashcards = []
                st.session_state.exam_questions = []

                st.toast(
                    ":green[**SUCCESS**]: PDF processed successfully", duration='short')
                st.rerun()

# ---------------- LLM ----------------
CHAT_MODEL = "models/gemini-2.5-flash"
GOOGLE_API_KEY = st.secrets["GOOGLE_API_KEY"]

llm = ChatGoogleGenerativeAI(
    model=CHAT_MODEL,
    google_api_key=GOOGLE_API_KEY,
    temperature=0.3
)


# ---------------- Flashcard Generation ----------------
if generate_flashcard_btn:
    if not st.session_state.chunks:
        st.toast(
            ":yellow:[**NOTICE**]: Please upload a PDF first", duration='short')
    else:
        with st.spinner("Generating flashcards..."):
            flashcards = generate_flashcards(
                llm=llm,
                chunks=st.session_state.chunks
            )
            st.session_state.flashcards = flashcards
        st.toast(
            f":green[**SUCCESS**]: Created {len(flashcards)} flashcards!", duration='short')


# ---------------- Flashcard UI ----------------
if st.session_state.flashcards:
    st.markdown("## Flashcards")
    for i, card in enumerate(st.session_state.flashcards):
        with st.expander(f"{i+1}. {card['question']}"):
            st.markdown(card["answer"])
            st.caption(f"📄 Source page: {card.get('page', 'N/A')}")


# ---------------- Exam UI ---------------------
if generate_exam_btn:
    if not st.session_state.chunks:
        st.toast(
            ":yellow:[**NOTICE**]: Please upload a PDF first", duration='short')
    else:
        with st.spinner("Generating exam questions..."):
            exam_questions = generate_exam_questions(
                llm=llm,
                chunks=st.session_state.chunks
            )
            st.session_state.exam_questions = exam_questions
        st.toast(
            f":green[**SUCCESS**]: Created {len(exam_questions)} exam questions!", duration='short')

if st.session_state.exam_questions:
    render_exam(st.session_state.exam_questions)

# ---------------- Chat Section ----------------
st.markdown("---")
st.markdown("## Ask Questions")

question = st.text_input("Ask a question about the document")

if question:
    if not st.session_state.retriever:
        st.toast(
            ":yellow:[**NOTICE**]: Please upload a PDF first", duration='short')
    else:
        with st.spinner("Thinking..."):
            docs = retrieve_with_threshold(
                st.session_state.vectorstore, question)
            context = build_context(docs)

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
