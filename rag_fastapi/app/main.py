from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_core.config import CHAT_MODEL_GROQ, GROQ_API_KEY
from rag_core.domain.chunking import chunk_documents
from rag_core.generation.answer import generate_answer
from rag_core.generation.context_compression import compress_context
from rag_core.generation.exam import generate_exam_questions
from rag_core.generation.flashcard import generate_flashcards
from rag_core.generation.history_aware import rephrase_question
from rag_core.loaders.pdf_loader import load_pdfs_from_dir
from rag_core.prompts.prompt_chat import get_chat_prompt
from rag_core.retrieval.hybrid_retriever import build_hybrid_search
from rag_core.retrieval.retriever import build_vectorstore


@dataclass
class DocumentState:
    id: str
    filename: str
    status: str = "uploaded"
    chunks: list[Any] = field(default_factory=list)
    retriever: Any = None
    vectorstore: Any = None


@dataclass
class ChatState:
    id: str
    messages: list[dict[str, Any]] = field(default_factory=list)


class MessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    document_id: str | None = None


class StudyRequest(BaseModel):
    document_id: str
    max_items: int = Field(default=20, ge=1, le=50)


app = FastAPI(title="RAG Chatbot API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

documents: dict[str, DocumentState] = {}
chats: dict[str, ChatState] = {}
_llm = None


def get_llm():
    global _llm
    if _llm is None:
        if not GROQ_API_KEY:
            raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured")
        from langchain_groq import ChatGroq

        _llm = ChatGroq(
            groq_api_key=GROQ_API_KEY,
            model_name=CHAT_MODEL_GROQ or "llama-3.3-70b-versatile",
            temperature=0.3,
        )
    return _llm


def get_document(document_id: str) -> DocumentState:
    document = documents.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.status != "ready":
        raise HTTPException(status_code=409, detail="Document has not finished processing")
    return document


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/documents")
def list_documents() -> list[dict[str, Any]]:
    return [
        {
            "id": item.id,
            "filename": item.filename,
            "status": item.status,
            "chunk_count": len(item.chunks),
        }
        for item in documents.values()
    ]


@app.post("/api/documents/upload")
def upload_document(file: UploadFile = File(...)) -> dict[str, str]:
    if Path(file.filename or "").suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    document_id = str(uuid.uuid4())
    state = DocumentState(id=document_id, filename=file.filename or "document.pdf")
    documents[document_id] = state

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            destination = Path(temp_dir) / state.filename
            with destination.open("wb") as output:
                shutil.copyfileobj(file.file, output)
            loaded = load_pdfs_from_dir(temp_dir)
            state.chunks = chunk_documents(loaded, mode="chat", strategy="recursive")
            state.vectorstore = build_vectorstore(state.chunks)
            state.retriever = build_hybrid_search(
                vectorstore=state.vectorstore,
                documents=state.chunks,
            )
            state.status = "ready"
    except Exception as exc:
        state.status = "failed"
        raise HTTPException(status_code=500, detail=f"Document processing failed: {exc}") from exc

    return {"id": state.id, "filename": state.filename, "status": state.status}


@app.post("/api/chat/sessions")
def create_chat_session() -> dict[str, Any]:
    session = ChatState(id=str(uuid.uuid4()))
    chats[session.id] = session
    return {"id": session.id, "messages": session.messages}


@app.get("/api/chat/sessions")
def list_chat_sessions() -> list[dict[str, Any]]:
    return [
        {"id": session.id, "title": next((m["content"][:40] for m in session.messages if m["role"] == "user"), "New chat"), "messages": len(session.messages)}
        for session in chats.values()
    ]


@app.get("/api/chat/sessions/{session_id}")
def get_chat_session(session_id: str) -> dict[str, Any]:
    session = chats.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"id": session.id, "messages": session.messages}


@app.post("/api/chat/sessions/{session_id}/messages")
def send_message(session_id: str, request: MessageRequest) -> dict[str, Any]:
    session = chats.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if not request.document_id:
        raise HTTPException(status_code=400, detail="A processed document is required")

    document = get_document(request.document_id)
    session.messages.append({"role": "user", "content": request.content})
    history = session.messages[:-1]

    try:
        llm = get_llm()
        standalone_question = rephrase_question(llm, request.content, history)
        docs = document.retriever.invoke(standalone_question)
        raw_context = "\n\n".join(item.page_content for item in docs)
        compressed = compress_context(llm, docs, standalone_question)
        context = compressed.strip() or raw_context
        answer = generate_answer(llm, get_chat_prompt(), context, standalone_question)
        pages = sorted({item.metadata.get("page", "N/A") for item in docs})
    except HTTPException:
        session.messages.pop()
        raise
    except Exception as exc:
        session.messages.pop()
        raise HTTPException(status_code=502, detail=f"Model request failed: {exc}") from exc

    assistant = {"role": "assistant", "content": answer, "sources": [{"page": page} for page in pages]}
    session.messages.append(assistant)
    return {"session_id": session.id, "user_message": session.messages[-2], "assistant_message": assistant}


@app.post("/api/study/flashcards")
def create_flashcards(request: StudyRequest) -> dict[str, Any]:
    document = get_document(request.document_id)
    try:
        cards = generate_flashcards(get_llm(), document.chunks, max_flashcards=request.max_items)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Flashcard generation failed: {exc}") from exc
    return {"document_id": document.id, "flashcards": cards}


@app.post("/api/study/exams")
def create_exam(request: StudyRequest) -> dict[str, Any]:
    document = get_document(request.document_id)
    try:
        questions = generate_exam_questions(get_llm(), document.chunks, max_questions=request.max_items)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Exam generation failed: {exc}") from exc
    return {"document_id": document.id, "questions": questions}
