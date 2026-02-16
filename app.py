import streamlit as st
import tempfile
import os

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from loaders.pdf_loader import load_pdfs_from_dir
from domain.chunking import chunk_documents
from retrieval.retriever import build_vectorstore, get_retriever
from retrieval.context_compression import compress_context
from generation.prompt import get_rag_prompt
from generation.answer import generate_answer
from generation.flashcard import generate_flashcards
from generation.exam import generate_exam_questions
from ui.exam_ui import render_exam
from utils.config import CHAT_MODEL, GOOGLE_API_KEY, CHAT_MODEL_GROQ, GROQ_API_KEY


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

if "messages" not in st.session_state:
    st.session_state.messages = []


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
    st.markdown("## Controls")

    col_ctrl1, col_ctrl2 = st.columns(2)
    
    with col_ctrl1:
        if st.button("New Chat", use_container_width=True):
            st.session_state.messages = []
            st.toast(":yellow[**NOTICE**]: Chat history cleared", duration='long')
            st.rerun()
            
    with col_ctrl2:
        if st.button("Reset All", use_container_width=True):
            for key in ["pdf_processed", "last_uploaded_file", "chunks", "vectorstore", "retriever", "flashcards", "exam_questions", "messages"]:
                st.session_state.pop(key, None)
            st.toast(":yellow[**NOTICE**]: All data reset", duration='long')
            st.rerun()


# ---------------- Load & Index PDF ----------------
if process_pdf_btn:
    if not uploaded_file:
        st.toast(
            ":yellow[**NOTICE**]: Please upload a PDF first", duration='long')
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

                st.toast(":green[**SUCCESS**]: PDF processed successfully", duration='long')
                st.rerun()

# ---------------- LLM ----------------
# llm = ChatGoogleGenerativeAI(
#     model=CHAT_MODEL,
#     google_api_key=GOOGLE_API_KEY,
#     temperature=0.3
# )

CHAT_MODEL_GROQ = "llama-3.3-70b-versatile"
GROQ_API_KEY = st.secrets["GROQ_API_KEY"]

llm = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name=CHAT_MODEL_GROQ,
    temperature=0.3
)


# ---------------- Flashcard Generation ----------------
if generate_flashcard_btn:
    if not st.session_state.chunks:
        st.toast(
            ":yellow[**NOTICE**]: Please upload a PDF first", duration='long')
    else:
        with st.spinner("Generating flashcards..."):
            flashcards = generate_flashcards(
                llm=llm,
                chunks=st.session_state.chunks
            )
            st.session_state.flashcards = flashcards
        st.toast(
            f":green[**SUCCESS**]: Created {len(flashcards)} flashcards!", duration='long')


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
            ":yellow[**NOTICE**]: Please upload a PDF first", duration='long')
    else:
        with st.spinner("Generating exam questions..."):
            exam_questions = generate_exam_questions(
                llm=llm,
                chunks=st.session_state.chunks
            )
            st.session_state.exam_questions = exam_questions
        st.toast(
            f":green[**SUCCESS**]: Created {len(exam_questions)} exam questions!", duration='long')

if st.session_state.exam_questions:
    render_exam(st.session_state.exam_questions)

# ---------------- Chat Section ----------------
st.markdown("---")

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("Ask a question about the document..."):
    
    if not st.session_state.pdf_processed:
        st.toast(":yellow[**NOTICE**]: Please upload and process a PDF first", duration='long')
    else:
        # 2. Thêm và hiển thị câu hỏi của người dùng
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # 3. Trả lời từ trợ lý AI
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                # Truy xuất tài liệu và tạo ngữ cảnh
                docs = st.session_state.retriever.invoke(prompt)
                context = "\n\n".join(d.page_content for d in docs)

                # Gọi LLM để tạo câu trả lời
                answer = generate_answer(
                    llm=llm,
                    prompt=get_rag_prompt(),
                    context=context,
                    question=prompt
                )

                # Trích xuất số trang nguồn để minh bạch dữ liệu
                pages = sorted(set(d.metadata.get("page", "N/A") for d in docs))
                source_text = f"\n\n*Sources: pages {pages}*"
                full_response = answer + source_text

                st.markdown(full_response)
                st.session_state.messages.append({"role": "assistant", "content": full_response})