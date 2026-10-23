# Thiết Kế Kiến Trúc Hệ Thống AI Code Review Đa Tác Nhân & AI RAG Đọc Tài Liệu (`/fastapi`)

Tài liệu này mô tả thiết kế tổng thể của tầng dịch vụ **FastAPI AI Engine** đặt tại thư mục `/fastapi`, đóng vai trò là bộ não xử lý trung tâm cho cả **Frontend React** (`frontend/`) lẫn **Backend Spring Boot** (`backend/`).

---

## 1. Sơ Đồ Kiến Trúc Tổng Thể (End-to-End Architecture)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT & APPLICATION LAYER                                  │
│                                                                                          │
│  ┌────────────────────────────────────────┐   ┌────────────────────────────────────────┐ │
│  │        DEVELOPER HUB (React UI)        │   │         ACADEMY HUB (React UI)         │ │
│  │  • Workbench IDE & Diff Viewer         │   │  • Document Reader & Citation Explorer │ │
│  │  • Multi-Agent Workflow Canvas         │   │  • Multi-Turn RAG Conversation         │ │
│  │  • Dynamic Model Selector Bar          │   │  • Flashcard & Exam Studio             │ │
│  └───────────────────┬────────────────────┘   └───────────────────┬────────────────────┘ │
└──────────────────────┼────────────────────────────────────────────┼──────────────────────┘
                       │ REST / JSON / SSE                          │ REST / JSON
                       ▼                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                     SPRING BOOT BACKEND (Port 8080) / DIRECT FE CLIENT                   │
│  • Auth & Workspace RBAC       • RagController & DocumentRagController                   │
│  • CodeReviewController        • RagFastApiClient (RestClient Bridge -> Port 8000)       │
└──────────────────────────────────────────────┬───────────────────────────────────────────┘
                                               │ HTTP Internal / REST API
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED FASTAPI AI ENGINE (/fastapi - Port 8000)                  │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        1. API ROUTER & CONTROLLER LAYER                            │  │
│  │  • GET  /api/health                        • GET  /api/models                      │  │
│  │  • POST /api/documents/upload              • POST /api/chat/sessions               │  │
│  │  • POST /api/chat/sessions/{id}/messages   • POST /api/studio/flashcards | /exam   │  │
│  │  • POST /api/code-review/analyze           • POST /api/code-review/pipeline        │  │
│  └───────────────┬────────────────────────────────────────────────┬───────────────────┘  │
│                  │                                                │                      │
│                  ▼                                                ▼                      │
│  ┌───────────────────────────────────────┐    ┌───────────────────────────────────────┐  │
│  │   2. HYBRID RAG & DOCUMENT ENGINE     │    │  3. MULTI-AGENT CODE REVIEW ENGINE    │  │
│  │  • Multi-Format Loader (PDF/MD/Code)  │    │  • AST / Diff Line Parser             │  │
│  │  • Recursive & Mode-Based Chunker     │◄───┼──• RAG Standard Rule Retriever        │  │
│  │  • Hybrid Retriever (FAISS + BM25)    │    │  • Agent 1: Architecture & Convention │  │
│  │  • History-Aware Query Rephraser      │    │  • Agent 2: Security & Vulnerability  │  │
│  │  • LLM Context Compressor             │    │  • Agent 3: Performance & Clean Code  │  │
│  │  • Citation & Page Mapper             │    │  • Agent 4: Consolidator & Diff Fixer │  │
│  └───────────────────┬───────────────────┘    └───────────────────┬───────────────────┘  │
│                      │                                            │                      │
│                      └─────────────────────┬──────────────────────┘                      │
│                                            ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                     4. DYNAMIC MULTI-MODEL ROUTER & ADAPTER                        │  │
│  │                                                                                    │  │
│  │        ┌─────────────────────────────────┴─────────────────────────────────┐       │  │
│  │        ▼                                                                   ▼       │  │
│  │  ┌─────────────────────────────────────────┐   ┌─────────────────────────────────┐ │  │
│  │  │      GOOGLE GEMINI PROVIDER ADAPTER     │   │      GROQ CLOUD ADAPTER         │ │  │
│  │  │  • gemini-3.1-pro-preview / gemini-pro  │   │  • llama-3.3-70b-versatile      │ │  │
│  │  │  • gemini-flash-latest (Gemini 3 Flash) │   │  • deepseek-r1-distill-llama-70b│ │  │
│  │  │  • Structured Schema & Thinking Config  │   │  • mixtral-8x7b-32768           │ │  │
│  │  └─────────────────────────────────────────┘   └─────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục `/fastapi`

- `fastapi/ARCHITECTURE_PLAN.md`: Tài liệu thiết kế kiến trúc, hợp đồng API (API Contracts) và luồng dữ liệu.
- `fastapi/schemas/models.py`: Định nghĩa toàn bộ Pydantic Models cho Multi-Model Selector, RAG Ingestion/Query, và Structured Code Review Report.
- `fastapi/router/llm_router.py`: Bộ định tuyến Đa Mô Hình (`MultiModelRouter`) kết nối linh hoạt **Google Gemini** và **Groq** trên từng request, hỗ trợ tách `<think>` trace của DeepSeek R1 và fallback tự động.
- `fastapi/services/rag_service.py`: Tầng dịch vụ tích hợp trực tiếp các module hiện có ở root (`domain/chunking.py`, `retrieval/retriever.py`, `retrieval/hybrid_retriever.py`, `generation/answer.py`, `generation/context_compression.py`, `generation/history_aware.py`, `generation/flashcard.py`, `generation/exam.py`).
- `fastapi/services/code_review_service.py`: Tầng điều phối **RAG-Grounded Code Review** và **Multi-Agent Pipeline** (Architecture Agent, Security Agent, Performance Agent, Consolidator & Patch Agent).
- `fastapi/main.py`: FastAPI Application cổng `8000` tương thích 100% với `RagFastApiClient.java` và `DocumentRagController.java` của Spring Boot Backend.
- `fastapi/Dockerfile`: Cấu hình đóng gói container cho service `rag-fastapi`.
