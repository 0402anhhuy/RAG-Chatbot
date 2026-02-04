import streamlit as st
import tempfile
import os
import time

from langchain_google_genai import ChatGoogleGenerativeAI

from loaders.pdf_loader import load_pdfs_from_dir
from domain.chunking import chunk_documents
from retrieval.retriever import build_vectorstore, get_retriever

from generation.prompt import get_rag_prompt
from generation.answer import generate_answer
from generation.flashcard import generate_flashcards
from generation.exam import generate_exam_questions

from ui.exam_ui import render_exam


# ================= PAGE CONFIG =================
st.set_page_config(
    page_title="RAG PDF Study App",
    layout="wide"
)


# ================= CONSTANTS =================
CHAT_MODEL = "models/gemini-1.5-flash"   # ✅ STABLE
MAX_CONTEXT_CHARS = 6000


# ================= SESSION STATE =================
def init_state():
    defaults = {
        "pdf_processed": False,
        "chunks": [],
        "retriever": None,
        "flashcards": [],
        "exam_questions": [],
        "uploaded_file_name": None
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

init_state()


# ================= SIDEBAR =================
with st.sidebar:
    st.markdown("## 📂 PDF Workspace")

    uploaded_file = st.file_uploader(
        "Upload PDF",
        type=["pdf"],
        label_visibility="collapsed"
    )

    # detect NEW file upload → reset state
    if uploaded_file and uploaded_file.name != st.session_state.uploaded_file_name:
        st.session_state.uploaded_file_name = uploaded_file.name
        st.session_state.pdf_processed = False
        st.session_state.chunks = []
        st.session_state.retriever = None
        st.session_state.flashcards = []
        st.session_state.exam_questions = []

    st.markdown("---")
    st.markdown("## ⚙️ Document")

    process_pdf_btn = st.button(
        "📄 Process PDF",
        use_container_width=True,
        disabled=st.session_state.pdf_processed or not uploaded_file
    )

    st.markdown("---")
    st.markdown("## 📚 Study Modes")

    col1, col2 = st.columns(2)

    with col1:
        generate_flashcard_btn = st.button(
            "🧠 Flashcards",
            use_container_width=True,
            disabled=not st.session_state.pdf_processed
        )

    with col2:
        generate_exam_btn = st.button(
            "📝 Exam",
            use_container_width=True,
            disabled=not st.session_state.pdf_processed
        )

    st.markdown("---")
    st.markdown("## ℹ️ Status")

    if st.session_state.pdf_processed:
        st.success("PDF processed")
        st.caption(f"📄 Chunks: {len(st.session_state.chunks)}")
    else:
        st.info("No PDF processed")

    if st.button("♻️ Reset", use_container_width=True):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()


# ================= MAIN =================
st.title("📘 RAG PDF Study Assistant")
st.caption("Chat with your PDF or study using flashcards & exams")


# ================= PROCESS PDF =================
if process_pdf_btn:
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
            st.session_state.pdf_processed = True
            st.session_state.flashcards = []
            st.session_state.exam_questions = []

    msg = st.sidebar.success("PDF processed successfully!")
    time.sleep(5)
    msg.empty()


# ================= FLASHCARDS =================
if generate_flashcard_btn:
    with st.spinner("Generating flashcards..."):
        llm = ChatGoogleGenerativeAI(
            model=CHAT_MODEL,
            google_api_key=st.secrets["GOOGLE_API_KEY"],
            temperature=0.3,
            max_output_tokens=800
        )

        st.session_state.flashcards = generate_flashcards(
            llm=llm,
            chunks=st.session_state.chunks
        )

    st.success(f"🧠 Created {len(st.session_state.flashcards)} flashcards")


if st.session_state.flashcards:
    st.markdown("## 🧠 Flashcards")
    for i, card in enumerate(st.session_state.flashcards):
        with st.expander(f"{i+1}. {card['question']}"):
            st.markdown(card["answer"])
            st.caption(f"📄 Page: {card.get('page', 'N/A')}")


# ================= EXAM =================
if generate_exam_btn:
    with st.spinner("Generating exam questions..."):
        llm = ChatGoogleGenerativeAI(
            model=CHAT_MODEL,
            google_api_key=st.secrets["GOOGLE_API_KEY"],
            temperature=0.3,
            max_output_tokens=1200
        )

        st.session_state.exam_questions = generate_exam_questions(
            llm=llm,
            chunks=st.session_state.chunks
        )

    st.success(f"📝 Created {len(st.session_state.exam_questions)} questions")


if st.session_state.exam_questions:
    render_exam(st.session_state.exam_questions)


# ================= CHAT =================
st.markdown("---")
st.markdown("## 💬 Ask Questions")

question = st.text_input("Ask a question about the document")

if question and st.session_state.retriever:
    with st.spinner("Thinking..."):
        docs = st.session_state.retriever.invoke(question)

        context = "\n\n".join(d.page_content for d in docs)
        context = context[:MAX_CONTEXT_CHARS]  # 🔥 FIX TOKEN

        llm = ChatGoogleGenerativeAI(
            model=CHAT_MODEL,
            google_api_key=st.secrets["GOOGLE_API_KEY"],
            temperature=0.3,
            max_output_tokens=512
        )

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
