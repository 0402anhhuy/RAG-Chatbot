import os
import tempfile

import streamlit as st
import streamlit.components.v1 as components
from langchain_groq import ChatGroq

from debug.print_utils import print_chunks_table
from domain.chunking import chunk_documents
from generation.answer import generate_answer
from generation.exam import generate_exam_questions
from generation.flashcard import generate_flashcards
from generation.prompt import get_rag_prompt
from loaders.pdf_loader import load_pdfs_from_dir
from retrieval.retriever import build_vectorstore, get_retriever
from ui.exam_ui import render_exam
from ui.flashcard_ui import render_flashcards
from utils.config import CHAT_MODEL_GROQ, GROQ_API_KEY


# ---------------- Page Config ----------------
st.set_page_config(
    page_title="RAG PDF Study App",
    layout="wide"
)

PANEL_HEIGHT_PX = 600

st.markdown(
        """
        <style>
            html, body {
                height: 100%;
                overflow: hidden;
            }
            div[data-testid="stAppViewContainer"],
            section.main {
                height: 100vh;
                overflow: hidden;
            }
            div.block-container {
                padding-top: 1rem;
                padding-bottom: 1rem;
            }
        </style>
        """,
        unsafe_allow_html=True,
)

DEFAULT_SESSION_STATE = {
    "pdf_processed": False,
    "last_uploaded_file": None,
    "chunks": [],
    "vectorstore": None,
    "retriever": None,
    "flashcards": [],
    "exam_questions": [],
    "messages": [],
    "chat_last_message_count": 0,
    "chat_pending_prompt": None,
    "conversation_mode": "chat",  # chat | flashcards | exam
}

# Trạng thái mặc định


def _ensure_session_state() -> None:
    for key, default_value in DEFAULT_SESSION_STATE.items():
        if key not in st.session_state:
            st.session_state[key] = default_value

# Hàm reset toàn bộ trạng thái - nút "Reset All"


def _reset_all() -> None:
    for key in list(DEFAULT_SESSION_STATE.keys()):
        st.session_state.pop(key, None)
    st.rerun()

# Hàm xóa lịch sử chat - nút "New Chat"


def _clear_chat() -> None:
    st.session_state.messages = []
    st.toast("Chat history cleared", duration="short")
    st.rerun()


_ensure_session_state()


st.title("RAG PDF Study App")

sources_col, chat_col, studio_col = st.columns([1.15, 2.4, 1.15], gap="small")


# ---------------- Sources Panel (Nguồn) ----------------
with sources_col:
    with st.container(border=True, height=PANEL_HEIGHT_PX):
        st.markdown("### Sources")
        # st.button("＋ Add document", use_container_width=True, key="src_add_source")

        # st.text_input(
        #     "Tìm nguồn mới trên web",
        #     placeholder="Tìm nguồn mới trên web",
        #     label_visibility="collapsed",
        #     disabled=True,
        #     key="src_web_search_disabled",
        # )

        uploaded_file = st.file_uploader(
            "Upload source",
            type=["pdf"],
            label_visibility="collapsed",
            key="src_pdf_uploader",
        )

        # --- LOGIC THÔNG MINH VỚI TOAST ---
        if uploaded_file is not None:
            if uploaded_file.name != st.session_state.last_uploaded_file:
                if st.session_state.last_uploaded_file is not None:
                    st.toast(
                        f":blue[**INFO**]: Detected new file: {uploaded_file.name}",
                        duration="long",
                    )
                st.session_state.pdf_processed = False
        else:
            st.session_state.pdf_processed = False
            st.session_state.last_uploaded_file = None

        process_pdf_btn = st.button(
            "Process PDF",
            use_container_width=True,
            disabled=(uploaded_file is None or st.session_state.pdf_processed),
            key="src_process_pdf",
        )

        st.markdown("---")
        st.markdown("#### Documents")
        if st.session_state.pdf_processed and st.session_state.last_uploaded_file:
            st.write(f"- {st.session_state.last_uploaded_file}")
        else:
            st.caption("Saved sources will appear here")

        with st.expander("Controls", expanded=False):
            ctrl1, ctrl2 = st.columns(2)
            with ctrl1:
                st.button("New Chat", use_container_width=True,
                          on_click=_clear_chat, key="src_new_chat")
            with ctrl2:
                st.button("Reset All", use_container_width=True,
                          on_click=_reset_all, key="src_reset_all")


# ---------------- Load & Index PDF ----------------
if process_pdf_btn:
    if not uploaded_file:
        st.toast(
            ":yellow[**NOTICE**]: Please upload a PDF first", duration="short")
    else:
        with st.spinner("Processing PDF..."):
            with tempfile.TemporaryDirectory() as tmpdir:
                pdf_path = os.path.join(tmpdir, uploaded_file.name)
                with open(pdf_path, "wb") as f:
                    f.write(uploaded_file.read())

                documents = load_pdfs_from_dir(tmpdir)
                chunks = chunk_documents(documents)

                print_chunks_table(chunks)

                vectorstore = build_vectorstore(chunks)
                retriever = get_retriever(vectorstore)

                st.session_state.chunks = chunks
                st.session_state.vectorstore = vectorstore
                st.session_state.retriever = retriever
                st.session_state.last_uploaded_file = uploaded_file.name
                st.session_state.pdf_processed = True

                st.session_state.flashcards = []
                st.session_state.exam_questions = []
                st.session_state.conversation_mode = "chat"

                st.toast(
                    ":green[**SUCCESS**]: PDF processed successfully", duration="long")
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


# ---------------- Chat Panel (Cuộc trò chuyện) ----------------
with chat_col:
    with st.container(border=True, height=PANEL_HEIGHT_PX):
        mode = st.session_state.get("conversation_mode", "chat")

        if mode in ("flashcards", "exam"):
            title_col, close_col = st.columns(
                [0.92, 0.08], vertical_alignment="center")
            with title_col:
                st.markdown("### Conversation")
            with close_col:
                if st.button("✕", use_container_width=True, key="conv_close"):
                    st.session_state.conversation_mode = "chat"
                    st.rerun()

            if mode == "flashcards":
                if not st.session_state.flashcards:
                    st.info(
                        "No flashcards yet. Click ‘Flashcards’ in Studio to generate.")
                else:
                    render_flashcards(st.session_state.flashcards)

            if mode == "exam":
                if not st.session_state.exam_questions:
                    st.info("No exam yet. Click ‘Exam’ in Studio to generate.")
                else:
                    render_exam(st.session_state.exam_questions)

        else:
            st.markdown("### Conversation")

            if not st.session_state.pdf_processed:
                st.toast(
                    ":yellow[**NOTICE**]: Please upload a PDF and click Process PDF", duration="infinite")

            # If a prompt was submitted in the previous run, generate the answer first.
            pending = st.session_state.get("chat_pending_prompt")
            if pending:
                if not st.session_state.pdf_processed:
                    st.toast(
                        ":yellow[**NOTICE**]: Please upload and process a PDF first", duration="long")
                    st.session_state.chat_pending_prompt = None
                else:
                    with st.spinner("Thinking..."):
                        docs = st.session_state.retriever.invoke(pending)
                        context = "\n\n".join(d.page_content for d in docs)

                        answer = generate_answer(
                            llm=llm,
                            prompt=get_rag_prompt(),
                            context=context,
                            question=pending,
                        )

                        pages = sorted({d.metadata.get("page", "N/A")
                                       for d in docs})
                        source_text = f"\n\n*Sources: pages {pages}*"
                        full_response = answer + source_text

                    st.session_state.messages.append(
                        {"role": "assistant", "content": full_response})
                    st.session_state.chat_pending_prompt = None

            for message in st.session_state.messages:
                with st.chat_message(message["role"]):
                    st.markdown(message["content"])

            # Anchor + autoscroll: after any new messages, scroll to bottom.
            st.markdown(
                "<div id='chat-bottom' style='height: 1px;'></div>", unsafe_allow_html=True)
            current_count = len(st.session_state.messages)
            if current_count != st.session_state.chat_last_message_count:
                st.session_state.chat_last_message_count = current_count
                components.html(
                    """
                    <script>
                    const scrollToBottom = () => {
                        const el = parent.document.querySelector('#chat-bottom');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    };
                    setTimeout(scrollToBottom, 50);
                    </script>
                    """,
                    height=0,
                )

            # Keep chat input at the bottom by placing it last.
            chat_placeholder = (
                "Ask a question about the document..."
                if st.session_state.pdf_processed
                else "Upload a document to get started"
            )
            prompt = st.chat_input(chat_placeholder, key="chat_input")

            if prompt:
                if not st.session_state.pdf_processed:
                    st.toast(
                        ":yellow[**NOTICE**]: Please upload and process a PDF first", duration="long")
                else:
                    st.session_state.messages.append(
                        {"role": "user", "content": prompt})
                    st.session_state.chat_pending_prompt = prompt
                    st.rerun()


# ---------------- Studio Panel (Flashcards / Exam) ----------------
with studio_col:
    with st.container(border=True, height=PANEL_HEIGHT_PX):
        st.markdown("### Studio")

        left, right = st.columns(2)

        with left:
            st.button("Mind map", use_container_width=True,
                      disabled=True, key="studio_mindmap")
            generate_flashcard_btn = st.button(
                "Flashcards",
                use_container_width=True,
                disabled=not st.session_state.pdf_processed,
                key="studio_flashcards",
            )

        with right:
            generate_exam_btn = st.button(
                "Exam",
                use_container_width=True,
                disabled=not st.session_state.pdf_processed,
                key="studio_exam",
            )
            st.button("Data report", use_container_width=True,
                      disabled=True, key="studio_data_report")

        if generate_flashcard_btn:
            if not st.session_state.chunks:
                st.toast(
                    ":yellow[**NOTICE**]: Please upload a PDF first", duration="long")
            else:
                if not st.session_state.flashcards:
                    with st.spinner("Generating flashcards..."):
                        flashcards = generate_flashcards(
                            llm=llm, chunks=st.session_state.chunks)
                        st.session_state.flashcards = flashcards
                st.toast(
                    f":green[**SUCCESS**]: Created {len(st.session_state.flashcards)} flashcards", duration="long")
                st.session_state.conversation_mode = "flashcards"
                st.rerun()

        if generate_exam_btn:
            if not st.session_state.chunks:
                st.toast(
                    ":yellow[**NOTICE**]: Please upload a PDF first", duration="long")
            else:
                if not st.session_state.exam_questions:
                    with st.spinner("Generating exam questions..."):
                        exam_questions = generate_exam_questions(
                            llm=llm, chunks=st.session_state.chunks)
                        st.session_state.exam_questions = exam_questions
                st.toast(
                    f":green[**SUCCESS**]: Created {len(st.session_state.exam_questions)} exam questions", duration="long")
                st.session_state.conversation_mode = "exam"
                st.rerun()

        st.markdown("---")
        st.markdown("### History conversations")
        with st.container(border=True, height=270):
            st.info("Coming soon")