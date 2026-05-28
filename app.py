import os
import tempfile
from datetime import datetime, timezone

import streamlit as st
import streamlit.components.v1 as components
from langchain_groq import ChatGroq

from domain.chunking import chunk_documents
from generation.answer import generate_answer
from generation.context_compression import compress_context
from generation.exam import generate_exam_questions
from generation.flashcard import generate_flashcards
from generation.history_aware import rephrase_question
from prompt.prompt_chat import get_chat_prompt
from loaders.pdf_loader import load_pdfs_from_dir
from retrieval.retriever import build_vectorstore, get_retriever
from retrieval.hybrid_retriever import build_hybrid_search
from ui.exam_ui import render_exam
from ui.flashcard_ui import render_flashcards
from utils.config import CHAT_MODEL_GROQ, GROQ_API_KEY


# ---------------- Page Config ----------------
st.set_page_config(
    page_title="RAG PDF Study App",
    layout="wide"
)

# Chiều cao cố định cho mỗi panel (Sources, Conversation, Studio)
PANEL_HEIGHT_PX = 600

st.markdown(body=
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

# Khởi tạo các trạng thái mặc định cho session state
DEFAULT_SESSION_STATE = {
    "pdf_processed": False,
    "last_uploaded_file": None,
    "chunks": [],
    "vectorstore": None,
    "retriever": None,
    "flashcards": [],
    "exam_questions": [],
    "messages": [],
    "chat_history": [],
    "chat_counter": 1,
    "active_chat_id": 1,
    "viewing_history_chat_id": None,
    "chat_last_message_count": 0,
    "chat_pending_prompt": None,
    "conversation_mode": "chat",
}

# Cài đặt trạng thái mặc định
def _ensure_session_state() -> None:
    for key, default_value in DEFAULT_SESSION_STATE.items():
        if key not in st.session_state:
            st.session_state[key] = default_value


def _make_chat_title(messages) -> str:
    for m in messages:
        if m.get("role") == "user":
            content = str(m.get("content", "")).strip()
            if content:
                content = " ".join(content.split())
                return content[:40] + ("…" if len(content) > 40 else "")
    return "New chat"


def _update_history_chat(chat_id: int, messages) -> None:
    history = st.session_state.get("chat_history", [])
    for chat in history:
        if int(chat.get("id", -1)) == int(chat_id):
            chat["messages"] = [dict(m) for m in list(messages)]
            return

# Hàm reset toàn bộ trạng thái - nút "Reset All"
def _reset_all() -> None:
    for key in list(DEFAULT_SESSION_STATE.keys()):
        st.session_state.pop(key, None)

# Hàm xóa lịch sử chat - nút "New Chat"
def _clear_chat() -> None:
    # Lưu chat hiện tại vào lịch sử, rồi tạo chat mới
    current_messages = list(st.session_state.get("messages", []))
    viewing_id = st.session_state.get("viewing_history_chat_id")

    # Nếu đang xem lại 1 chat trong history: update lại đúng chat đó (không append mới)
    if current_messages and viewing_id is not None:
        _update_history_chat(int(viewing_id), current_messages)

    # Nếu đang là chat mới (chưa thuộc history): archive thành 1 record mới
    if current_messages and viewing_id is None:
        st.session_state.chat_history.append(
            {
                "id": int(st.session_state.get("active_chat_id", 1)),
                "title": _make_chat_title(current_messages),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "messages": [dict(m) for m in current_messages],
            }
        )

    st.session_state.chat_counter = int(st.session_state.get("chat_counter", 1)) + 1
    st.session_state.active_chat_id = st.session_state.chat_counter
    st.session_state.viewing_history_chat_id = None
    st.session_state.messages = []
    st.session_state.chat_pending_prompt = None
    st.session_state.chat_last_message_count = 0
    st.session_state.conversation_mode = "chat"
    st.toast(body=":blue[**INFO**]: Started a new chat", duration="short")

def _load_chat_from_history(chat_id: int) -> None:
    # Persist any edits to the currently opened historical chat before switching
    current_viewing = st.session_state.get("viewing_history_chat_id")
    if current_viewing is not None:
        _update_history_chat(int(current_viewing), st.session_state.get("messages", []))

    history = st.session_state.get("chat_history", [])
    for chat in history:
        if int(chat.get("id", -1)) == int(chat_id):
            archived = chat.get("messages") or []
            st.session_state.messages = [dict(m) for m in archived]
            st.session_state.chat_pending_prompt = None
            st.session_state.chat_last_message_count = 0
            st.session_state.conversation_mode = "chat"
            st.session_state.viewing_history_chat_id = int(chat_id)
            st.session_state.active_chat_id = int(chat_id)


_ensure_session_state()


st.title("RAG PDF Study App")

sources_col, chat_col, studio_col = st.columns(spec=[1.15, 2.4, 1.15], gap="small")


# ---------------- Sources Panel ----------------
with sources_col:
    with st.container(border=True, height=PANEL_HEIGHT_PX):
        st.markdown("### Sources")
        uploaded_file = st.file_uploader(
            label="Upload source",
            type=["pdf"],
            label_visibility="collapsed",
            key="src_pdf_uploader",
        )

        if uploaded_file is not None:
            if uploaded_file.name != st.session_state.last_uploaded_file:
                if st.session_state.last_uploaded_file is not None:
                    st.toast(
                        body=f":blue[**INFO**]: Detected new file: {uploaded_file.name}",
                        duration="long",
                    )
                st.session_state.pdf_processed = False
        else:
            st.session_state.pdf_processed = False
            st.session_state.last_uploaded_file = None

        process_pdf_btn = st.button(
            label="Process PDF",
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

        with st.expander(label="Controls", expanded=False):
            ctrl1, ctrl2 = st.columns(2)
            with ctrl1:
                st.button(
                    label="New Chat", use_container_width=True,
                    on_click=_clear_chat, key="src_new_chat"
                )
            with ctrl2:
                st.button(
                    label="Reset All", use_container_width=True,
                    on_click=_reset_all, key="src_reset_all"
                )


# ---------------- Load & Index PDF ----------------
if process_pdf_btn:
    if not uploaded_file:
        st.toast(
            body=":yellow[**NOTICE**]: Please upload a PDF first",
            duration="short"
        )
    else:
        with st.spinner("Processing PDF..."):
            with tempfile.TemporaryDirectory() as tmpdir:
                pdf_path = os.path.join(tmpdir, uploaded_file.name)
                with open(pdf_path, "wb") as f:
                    f.write(uploaded_file.read())

                documents = load_pdfs_from_dir(tmpdir)
                chunks = chunk_documents(documents, mode="chat", strategy="recursive")

                vectorstore = build_vectorstore(chunks=chunks)
                # retriever = get_retriever(vectorstore=vectorstore)
                retriever = build_hybrid_search(vectorstore=vectorstore, documents=chunks)

                st.session_state.chunks = chunks
                st.session_state.vectorstore = vectorstore
                st.session_state.retriever = retriever
                st.session_state.last_uploaded_file = uploaded_file.name
                st.session_state.pdf_processed = True

                st.session_state.flashcards = []
                st.session_state.exam_questions = []
                st.session_state.conversation_mode = "chat"

                st.toast(
                    body=":green[**SUCCESS**]: PDF processed successfully",
                    duration="long"
                )
                st.rerun()

# ---------------- LLM ----------------
CHAT_MODEL_GROQ = "llama-3.3-70b-versatile"
GROQ_API_KEY = st.secrets["GROQ_API_KEY"]

llm = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name=CHAT_MODEL_GROQ,
    temperature=0.3
)

# ---------------- Chat Panel ----------------
with chat_col:
    with st.container(border=True, height=PANEL_HEIGHT_PX):
        mode = st.session_state.get("conversation_mode", "chat")

        if mode in ("flashcards", "exam"):
            title_col, close_col = st.columns(
                spec=[0.92, 0.08],
                vertical_alignment="center"
            )
            with close_col:
                if st.button(label="✕", use_container_width=True, key="conv_close"):
                    st.session_state.conversation_mode = "chat"
                    st.rerun()

            if mode == "flashcards":
                if not st.session_state.flashcards:
                    st.toast(
                        body=":yellow[**NOTICE**]: No flashcards to display",
                        duration="short"
                    )
                else:
                    with title_col:
                        st.markdown("### Flashcards")
                    render_flashcards(flashcards=st.session_state.flashcards)

            if mode == "exam":
                if not st.session_state.exam_questions:
                    st.toast(
                        body=":yellow[**NOTICE**]: No exam yet",
                        duration="short"
                    )
                else:
                    with title_col:
                        st.markdown("### Exam")
                    render_exam(exam_questions=st.session_state.exam_questions)

        else:
            st.markdown("### Conversation")

            if not st.session_state.pdf_processed:
                st.toast(
                    body=":yellow[**NOTICE**]: Upload a PDF and click 'Process PDF' to start chatting",
                    duration="infinite"
                )

            pending = st.session_state.get("chat_pending_prompt")
            if pending:
                if not st.session_state.pdf_processed:
                    st.toast(
                        body=":yellow[**NOTICE**]: Please upload and process a PDF first", 
                        duration="long"
                    )
                    st.session_state.chat_pending_prompt = None
                else:
                    with st.spinner("Thinking..."):
                        # --- Multi-turn Conversation: Rephrase question ---
                        # st.session_state.messages có chứa user prompt mới nhất ở cuối cùng,
                        # nên ta truyền vào history là tất cả các tin nhắn trước đó ([:-1])
                        history_for_rephrase = st.session_state.messages[:-1]
                        standalone_q = rephrase_question(llm=llm, question=pending, history=history_for_rephrase)
                        
                        docs = st.session_state.retriever.invoke(standalone_q)
                        raw_context = "\n\n".join(d.page_content for d in docs)
                        compressed = compress_context(llm=llm, docs=docs, question=standalone_q)
                        context = compressed if compressed.strip() else raw_context

                        answer = generate_answer(
                            llm=llm,
                            prompt=get_chat_prompt(),
                            context=context,
                            question=standalone_q,
                        )

                        pages = sorted({d.metadata.get("page", "N/A") for d in docs})
                        source_text = f"\n\n*Sources: pages {pages}*"
                        full_response = answer + source_text

                    st.session_state.messages.append({"role": "assistant", "content": full_response})
                    st.session_state.chat_pending_prompt = None

                    if st.session_state.get("viewing_history_chat_id") is not None:
                        _update_history_chat(
                            int(st.session_state.viewing_history_chat_id),
                            st.session_state.messages,
                        )

            for message in st.session_state.messages:
                with st.chat_message(message["role"]):
                    st.markdown(message["content"])

            # Anchor + autoscroll: after any new messages, scroll to bottom.
            st.markdown(
                body="<div id='chat-bottom' style='height: 1px;'></div>", 
                unsafe_allow_html=True
            )

            current_count = len(st.session_state.messages)
            if current_count != st.session_state.chat_last_message_count:
                st.session_state.chat_last_message_count = current_count
                components.html(html=
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
            prompt = st.chat_input(placeholder=chat_placeholder, key="chat_input")

            if prompt:
                if not st.session_state.pdf_processed:
                    st.toast(
                        body=":yellow[**NOTICE**]: Please upload and process a PDF first",
                        duration="long"
                    )
                else:
                    st.session_state.messages.append(
                        {"role": "user", "content": prompt})

                    if st.session_state.get("viewing_history_chat_id") is not None:
                        _update_history_chat(
                            int(st.session_state.viewing_history_chat_id),
                            st.session_state.messages,
                        )

                    st.session_state.chat_pending_prompt = prompt
                    st.rerun()


# ---------------- Studio Panel ----------------
with studio_col:
    with st.container(border=True, height=PANEL_HEIGHT_PX):
        st.markdown("### Studio")

        left, right = st.columns(2)

        with left:
            generate_flashcard_btn = st.button(
                label="Flashcards",
                use_container_width=True,
                disabled=not st.session_state.pdf_processed,
                key="studio_flashcards",
            )

        with right:
            generate_exam_btn = st.button(
                label="Exam",
                use_container_width=True,
                disabled=not st.session_state.pdf_processed,
                key="studio_exam",
            )

        if generate_flashcard_btn:
            if not st.session_state.chunks:
                st.toast(
                    body=":yellow[**NOTICE**]: Please upload a PDF first", 
                    duration="long"
                )
            else:
                if not st.session_state.flashcards:
                    with st.spinner("Generating flashcards..."):
                        flashcards = generate_flashcards(
                            llm=llm, chunks=st.session_state.chunks)
                        st.session_state.flashcards = flashcards
                st.toast(
                    body=f":green[**SUCCESS**]: Created {len(st.session_state.flashcards)} flashcards", 
                    duration="long"
                )
                st.session_state.conversation_mode = "flashcards"
                st.rerun()

        if generate_exam_btn:
            if not st.session_state.chunks:
                st.toast(
                    body=":yellow[**NOTICE**]: Please upload a PDF first", 
                    duration="long"
                )
            else:
                if not st.session_state.exam_questions:
                    with st.spinner("Generating exam questions..."):
                        exam_questions = generate_exam_questions(
                            llm=llm, chunks=st.session_state.chunks)
                        st.session_state.exam_questions = exam_questions
                st.toast(
                    body=f":green[**SUCCESS**]: Created {len(st.session_state.exam_questions)} exam questions", 
                    duration="long"
                )
                st.session_state.conversation_mode = "exam"
                st.rerun()

        st.markdown("---")
        st.markdown("### History conversations")
        with st.container(border=True, height=324):
            history = st.session_state.get("chat_history", [])
            if not history:
                st.caption("No saved conversations yet")
            else:
                # Show newest first
                for chat in reversed(history):
                    title = str(chat.get("title") or f"Chat {chat.get('id', '')}").strip()
                    created_at = str(chat.get("created_at") or "").strip()
                    messages = chat.get("messages") or []

                    timestamp_label = created_at
                    if created_at:
                        try:
                            dt = datetime.fromisoformat(created_at)
                            timestamp_label = dt.astimezone().strftime("%Y-%m-%d %H:%M")
                        except Exception:
                            timestamp_label = created_at

                    label = (
                        f"{title} • {timestamp_label} • {len(messages)} msgs"
                        if timestamp_label
                        else f"{title} • {len(messages)} msgs"
                    )
                    st.button(
                        label,
                        key=f"history_open_{chat.get('id', '')}",
                        use_container_width=True,
                        on_click=_load_chat_from_history,
                        args=(int(chat.get("id", -1)),),
                    )