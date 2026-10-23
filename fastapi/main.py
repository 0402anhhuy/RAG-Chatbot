import os
import sys
from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
for p in (ROOT_DIR, CURRENT_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

from router.llm_router import MultiModelRouter
from schemas.models import (
    CodeReviewRequest,
    CodeReviewResponse,
    DocumentUploadResponse,
    RagMessageRequest,
    RagMessageResponse,
)
from services.code_review_service import MultiAgentCodeReviewService
from services.rag_service import HybridRagService

app = FastAPI(
    title="Prism Multi-Model AI Code Review & Hybrid RAG Engine",
    version="1.0.0",
    description="Unified FastAPI microservice for Multi-Model Code Review (Gemini & Groq) and Document RAG.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_service = HybridRagService()
code_review_service = MultiAgentCodeReviewService(rag_service=rag_service)


@app.get("/api/health")
def health():
    return {
        "status": "UP",
        "service": "prism-ai-engine-fastapi",
        "indexed_documents": len(rag_service.documents_meta),
    }


@app.get("/api/models")
def list_available_models():
    return {"models": [m.model_dump() for m in MultiModelRouter.list_models()]}


@app.post("/api/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    collection_type: str = Form("study_document"),
):
    content = await file.read()
    return rag_service.ingest_pdf_bytes(
        filename=file.filename or "uploaded.pdf",
        file_bytes=content,
        collection_type=collection_type,
    )


@app.get("/api/documents")
def list_documents():
    return {"documents": list(rag_service.documents_meta.values())}


@app.post("/api/chat/sessions")
def create_chat_session():
    return rag_service.create_session()


@app.post("/api/chat/sessions/{session_id}/messages", response_model=RagMessageResponse)
def send_chat_message(session_id: str, request: RagMessageRequest):
    return rag_service.query_session(session_id=session_id, request=request)


@app.post("/api/studio/flashcards")
def generate_studio_flashcards(document_id: str, model_id: Optional[str] = None):
    cards = rag_service.create_flashcards(document_id=document_id, model_id=model_id)
    return {"document_id": document_id, "flashcards": cards}


@app.post("/api/studio/exam")
def generate_studio_exam(document_id: str, model_id: Optional[str] = None):
    questions = rag_service.create_exam(document_id=document_id, model_id=model_id)
    return {"document_id": document_id, "exam_questions": questions}


@app.post("/api/code-review/analyze", response_model=CodeReviewResponse)
def analyze_code_review(request: CodeReviewRequest):
    return code_review_service.analyze_code(request=request)
