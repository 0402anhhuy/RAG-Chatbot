import os
import shutil
import tempfile
import uuid
from typing import Dict, List, Optional

from domain.chunking import chunk_documents
from generation.answer import generate_answer
from generation.context_compression import compress_context
from generation.exam import generate_exam_questions
from generation.flashcard import generate_flashcards
from generation.history_aware import rephrase_question
from loaders.pdf_loader import load_pdfs_from_dir
from prompt.prompt_chat import get_chat_prompt
from retrieval.hybrid_retriever import build_hybrid_search
from retrieval.retriever import build_vectorstore

try:
    from router.llm_router import MultiModelRouter
    from schemas.models import (
        DocumentUploadResponse,
        RagCitation,
        RagMessageRequest,
        RagMessageResponse,
    )
except ImportError:
    from fastapi.router.llm_router import MultiModelRouter
    from fastapi.schemas.models import (
        DocumentUploadResponse,
        RagCitation,
        RagMessageRequest,
        RagMessageResponse,
    )


class HybridRagService:
    """
    Stateful & Persistent Hybrid RAG Engine (FAISS Vector + BM25 Ensemble)
    reusing the repository's core domain/retrieval/generation modules.
    Serves both Academy Hub (Study RAG) and Developer Hub (Coding Standard RAG).
    """

    def __init__(self) -> None:
        self.documents_meta: Dict[str, dict] = {}
        self.retrievers: Dict[str, any] = {}
        self.chunks_store: Dict[str, list] = {}
        self.sessions: Dict[str, List[dict]] = {}

    def create_session(self) -> dict:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = []
        return {"session_id": session_id, "status": "ACTIVE"}

    def ingest_pdf_bytes(
        self,
        filename: str,
        file_bytes: bytes,
        collection_type: str = "study_document",
    ) -> DocumentUploadResponse:
        doc_id = str(uuid.uuid4())
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, filename)
            with open(pdf_path, "wb") as f:
                f.write(file_bytes)

            documents = load_pdfs_from_dir(tmpdir)
            chunks = chunk_documents(documents, mode="chat", strategy="recursive")
            vectorstore = build_vectorstore(chunks=chunks)
            retriever = build_hybrid_search(vectorstore=vectorstore, documents=chunks)

            self.chunks_store[doc_id] = chunks
            self.retrievers[doc_id] = retriever
            self.documents_meta[doc_id] = {
                "document_id": doc_id,
                "filename": filename,
                "collection_type": collection_type,
                "chunk_count": len(chunks),
            }

        return DocumentUploadResponse(
            document_id=doc_id,
            filename=filename,
            collection_type=collection_type,
            chunk_count=len(chunks),
            status="READY",
        )

    def query_session(self, session_id: str, request: RagMessageRequest) -> RagMessageResponse:
        if session_id not in self.sessions:
            self.sessions[session_id] = []

        history = self.sessions[session_id]
        llm, spec = MultiModelRouter.get_llm(request.model_id, temperature=0.3)

        target_doc_id = request.document_id or next(iter(self.retrievers.keys()), None)
        if not target_doc_id or target_doc_id not in self.retrievers:
            return RagMessageResponse(
                session_id=session_id,
                content="Please upload and index a PDF document first.",
                model_used=spec.id,
                provider=spec.provider,
                citations=[],
            )

        retriever = self.retrievers[target_doc_id]
        doc_meta = self.documents_meta[target_doc_id]

        standalone_q = rephrase_question(
            llm=llm,
            question=request.content,
            history=history,
        )
        docs = retriever.invoke(standalone_q)
        raw_context = "\n\n".join(d.page_content for d in docs)

        if request.compress_context:
            compressed = compress_context(llm=llm, docs=docs, question=standalone_q)
            context = compressed if compressed.strip() else raw_context
        else:
            context = raw_context

        raw_answer = generate_answer(
            llm=llm,
            prompt=get_chat_prompt(),
            context=context,
            question=standalone_q,
        )
        clean_answer, reasoning_trace = MultiModelRouter.extract_thinking_trace(raw_answer)

        citations = [
            RagCitation(
                document_id=target_doc_id,
                filename=doc_meta["filename"],
                page=d.metadata.get("page", "N/A"),
                score="Hybrid Match (BM25 + FAISS)",
                snippet=d.page_content[:280],
            )
            for d in docs
        ]

        history.append({"role": "user", "content": request.content})
        history.append({"role": "assistant", "content": clean_answer})

        return RagMessageResponse(
            session_id=session_id,
            content=clean_answer,
            model_used=spec.id,
            provider=spec.provider,
            reasoning_trace=reasoning_trace,
            citations=citations,
        )

    def retrieve_coding_standards_context(
        self, query: str, standard_document_ids: Optional[List[str]] = None
    ) -> tuple[str, List[str]]:
        """
        Used by the Multi-Agent Code Review service to ground code reviews
        against uploaded Architecture & Coding Convention PDFs.
        """
        target_ids = standard_document_ids or [
            doc_id
            for doc_id, meta in self.documents_meta.items()
            if meta.get("collection_type") == "coding_standard"
        ]
        if not target_ids:
            target_ids = list(self.retrievers.keys())[:1]

        snippets: List[str] = []
        applied_files: List[str] = []
        for doc_id in target_ids:
            retriever = self.retrievers.get(doc_id)
            if not retriever:
                continue
            meta = self.documents_meta[doc_id]
            applied_files.append(meta["filename"])
            docs = retriever.invoke(query)
            for d in docs[:3]:
                page = d.metadata.get("page", "N/A")
                snippets.append(f"[{meta['filename']} - Page {page}]: {d.page_content}")

        return "\n\n".join(snippets), applied_files

    def create_flashcards(self, document_id: str, model_id: Optional[str] = None) -> list:
        chunks = self.chunks_store.get(document_id, [])
        if not chunks:
            return []
        llm, _ = MultiModelRouter.get_llm(model_id, temperature=0.3)
        return generate_flashcards(llm=llm, chunks=chunks)

    def create_exam(self, document_id: str, model_id: Optional[str] = None) -> list:
        chunks = self.chunks_store.get(document_id, [])
        if not chunks:
            return []
        llm, _ = MultiModelRouter.get_llm(model_id, temperature=0.3)
        return generate_exam_questions(llm=llm, chunks=chunks)
