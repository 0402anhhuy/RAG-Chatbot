# Kiến Trúc Hệ Thống AI Code Review Đa Tác Nhân, AI RAG Đọc Tài Liệu & Khắc Phục Dev Server (Port 3000)

Thiết kế dịch vụ lõi AI tập trung (FastAPI AI Engine) đóng vai trò trung tâm xử lý cho **Hệ thống AI RAG Đọc Tài Liệu** và **Hệ thống AI Code Review Đa Tác Nhân** hỗ trợ chuyển đổi linh hoạt giữa **Google Gemini** và **Groq**, đồng thời **khắc phục triệt để lỗi khởi động Dev Server trên cổng 3000** để toàn bộ giao diện React và API hoạt động mượt mà ngay trên môi trường Preview lẫn Docker.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Vì sao Dev Server hiện chưa khởi động?**
> Hiện tại hệ thống đang ở chế độ **Planning Mode** (chờ bạn nhấn **Proceed** để cho phép chỉnh sửa code). Trong source code gốc:
> 1. Ứng dụng React nằm tách biệt trong thư mục con `frontend/` mà chưa có cấu hình khởi chạy ở thư mục gốc dẫn tới cổng `0.0.0.0:3000`.
> 2. File `app.py` ở thư mục gốc là script Streamlit cũ gọi trực tiếp `st.secrets["GROQ_API_KEY"]` nên gây lỗi khi container tự động chạy.
>
> **Ngay khi bạn nhấn nút `Proceed` (Phê duyệt kế hoạch)**, hệ thống sẽ lập tức cấu hình Dev Server chuẩn trên cổng `3000`, khởi chạy giao diện React cùng hệ thống API AI Code Review & RAG.

- **Confirmed Decision 1 — Khắc phục Dev Server & Chuẩn hóa Runtime (Port 3000)**:
  - Thiết lập cấu hình khởi chạy tập trung tại thư mục gốc kết nối thẳng tới ứng dụng React (`0.0.0.0:3000`) và tầng API backend, loại bỏ lỗi crash do `st.secrets` của Streamlit cũ.
- **Confirmed Decision 2 — Kiến trúc AI Service độc lập & tập trung (`fastapi`)**:
  - Xây dựng tầng dịch vụ AI chuyên biệt đóng gói toàn bộ logic Định tuyến Đa Model (Multi-Model Router), Hybrid RAG và Code Review Pipeline, cung cấp chuẩn REST/JSON API thống nhất để cả **Spring Boot Backend** lẫn **React Frontend** (Developer Hub & Academy Hub) đều có thể gọi tới.
- **Confirmed Decision 3 — Bộ định tuyến Đa Mô Hình (Multi-Model Switcher)**:
  - Hỗ trợ chuyển đổi tức thời trên từng request giữa hai hệ sinh thái:
    - **Google Gemini**: `gemini-4-argon` (phân khúc Gemini 3.1 Pro cho suy luận kiến trúc & review chuyên sâu) và `gemini-flash-latest` / `gemini-3.8-flash` (Gemini 3 Flash tốc độ cao cho hỏi đáp tài liệu RAG & nén ngữ cảnh).
    - **Groq Cloud**: `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`, và `deepseek-r1-distill-llama-70b`.
- **Confirmed Decision 4 — Tam giác năng lực AI Code Review**:
  1. *Review đối chiếu tài liệu chuẩn (RAG-Grounded Review)*: Tự động truy xuất Coding Convention / Architecture Guideline từ kho tài liệu RAG để kiểm tra tính tuân thủ của code.
  2. *Phân tích theo dòng lệnh & gợi ý sửa lỗi (Inline Diagnostics & Unified Diff/Fix)*: Trả về cấu trúc JSON định danh chính xác dòng code, mức độ nghiêm trọng (`CRITICAL`, `WARNING`, `INFO`), trích dẫn quy tắc vi phạm và đoạn code thay thế.
  3. *Pipeline Đa Tác Nhân trên Canvas (Multi-Agent Workflow)*: Điều phối tuần tự và song song các Agent chuyên trách (`Architecture & Standards Agent`, `Security Vulnerability Agent`, `Performance & Clean Code Agent`, `Synthesis & Patch Agent`).

---

### 1. Overview & Core Concept

- **What It Does**: Hệ thống giải quyết đồng thời bài toán vận hành máy chủ phát triển (Dev Server Port 3000) và hợp nhất hai luồng trí tuệ nhân tạo cốt lõi trên cùng một nền tảng tri thức:
  1. **Unified Dev Server & API Bridge (Port 3000)**: Khởi chạy giao diện React (Developer Hub & Academy Hub) trên `0.0.0.0:3000` kèm cầu nối API (`/api/*`) xử lý trực tiếp hoặc ủy quyền sang dịch vụ FastAPI/Spring Boot, đảm bảo ứng dụng luôn khởi động thành công trong mọi môi trường.
  2. **Document RAG Engine**: Cho phép tải lên tài liệu học thuật, đặc tả kỹ thuật, kiến trúc hệ thống và quy chuẩn lập trình (PDF/Markdown), thực hiện băm nhỏ thông minh (Recursive Chunking), đánh chỉ mục kép (FAISS Vector + BM25 Keyword) và trả lời đa vòng có trích dẫn trang chính xác, tạo Flashcards hoặc Đề thi.
  3. **RAG-Augmented Multi-Agent Code Review Engine**: Cho phép lập trình viên gửi mã nguồn hoặc bản thay đổi (Git Diff), chọn mô hình AI mong muốn (Gemini hoặc Groq), kết nối với bộ tài liệu quy chuẩn dự án trong RAG và kích hoạt luồng chấm điểm, bắt lỗi bảo mật/hiệu năng kèm bản vá code tự động.
- **Target Audience / Persona**:
  - **Kỹ sư phần mềm & Tech Lead (Developer Hub)**: Sử dụng Workbench IDE và Workflow Canvas để review code tự động theo quy chuẩn nội bộ của tổ chức và so sánh chất lượng phản hồi giữa các model.
  - **Người học & Nghiên cứu viên (Academy Hub)**: Tra cứu giáo trình, đặt câu hỏi chuyên sâu đa ngữ cảnh và tự động sinh học liệu ôn tập.
- **Key Value**: Khắc phục triệt để sự cố không lên Dev Server do cấu trúc đa thư mục (`frontend/`, `backend/`, Python scripts), đồng thời kết nối trực tiếp bộ nhớ RAG chứa tài liệu thiết kế của dự án vào các Agent chấm code qua bộ định tuyến đa mô hình (Gemini & Groq).

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Luồng 0 — Khởi Động Tức Thời & Chuyển Đổi Hub (Zero-Crash Startup)**:
     - Khi mở ứng dụng trên cổng `3000`, người dùng lập tức thấy trang **Overview Hub** để chọn vào **Developer Hub** (Workbench IDE, Canvas Pipeline, Code Review) hoặc **Academy Hub** (Courseware RAG, Documents, Quizzes) mà không gặp lỗi kết nối máy chủ.
  2. **Luồng 1 — Nạp Tài Liệu Quy Chuẩn & Hỏi Đáp RAG (Document Ingestion & Knowledge Query)**:
     - Người dùng tải tài liệu PDF (giáo trình hoặc tài liệu kiến trúc/coding standard) qua giao diện quản lý tài liệu.
     - Hệ thống phân tách chunk, lưu trữ vào vùng chỉ mục theo từng Workspace/Namespace (`general_study` hoặc `coding_standards`) và trả về trạng thái sẵn sàng kèm số lượng vector đã lập chỉ mục.
     - Khi người dùng đặt câu hỏi kèm lựa chọn Model trên thanh công cụ, hệ thống tái diễn đạt câu hỏi theo lịch sử hội thoại (History-Aware Rephrasing), truy xuất Hybrid Search (BM25 + FAISS), nén ngữ cảnh (Context Compression) và trả về câu trả lời kèm trích dẫn trang (`Page`, `Score`, `Snippet`).
  3. **Luồng 2 — Review Code Tương Tác & Gợi Ý Bản Vá (Interactive IDE Code Review)**:
     - Trong **Workbench IDE**, người dùng mở file mã nguồn hoặc dán đoạn Git Diff, chọn bộ tài liệu quy chuẩn cần đối chiếu và chọn Model từ menu chuyển đổi (`Gemini 3.1 Pro`, `Gemini 3 Flash`, `Llama 3.3 70B`, `DeepSeek R1`, `Mixtral 8x7B`).
     - Hệ thống trả về bảng tổng hợp điểm chất lượng và danh sách phát hiện theo từng dòng code (Line-by-Line Findings), hiển thị rõ nhãn mức độ nghiêm trọng, đoạn quy chuẩn trích từ tài liệu RAG và khung so sánh code gốc với code đã sửa (Suggested Diff Patch).
  4. **Luồng 3 — Thực Thi Pipeline Đa Tác Nhân Trên Canvas (Multi-Agent Canvas Execution)**:
     - Trong **Workbench Canvas**, người dùng kích hoạt luồng `Code Review Pipeline` gồm các Node tác nhân kết nối với nhau:
       - *Node 1 (Architecture & RAG Compliance Agent)*: Đối chiếu cấu trúc code với tài liệu thiết kế trong RAG.
       - *Node 2 (Security & Performance Parallel Agents)*: Quét lỗ hổng bảo mật (OWASP, injection, lộ secret) song song với phân tích độ phức tạp thuật toán và truy vấn N+1.
       - *Node 3 (Consolidator & Auto-Fix Agent)*: Tổng hợp báo cáo thống nhất, khử trùng lặp và sinh bản vá hoàn chỉnh.
     - Trạng thái từng Node chuyển đổi trực quan theo thời gian thực (`IDLE` → `RUNNING` → `COMPLETED`) và cho phép cấu hình model riêng biệt cho từng Agent.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Giữ nguyên bản sắc giao diện hiện có của dự án và nâng cấp theo chuẩn **Enterprise Developer Console & Knowledge Workspace**, ưu tiên độ sắc nét của dữ liệu, cấu trúc phẳng một tầng độ cao (Single-Elevation Depth) với đường viền mảnh `1px solid` tinh tế.
  - *Color Palette & Mood (60-30-10 Discipline)*:
    - **60% Dominant Neutral Canvas**: Nền sáng sạch (`#F0F2F5` / `#FFFFFF`) cho không gian đọc tài liệu và khung soạn thảo độ tương phản cao.
    - **30% Structural Surfaces**: Bề mặt bảng điều khiển phụ (`#F9FAFB`), viền phân tách mảnh (`#E5E7EB`) và chữ mô tả trung tính (`#4B5663`, `#6B7280`).
    - **10% Semantic & Action Accents**: Nút hành động chính màu than chì đậm (`#111827`), điểm nhấn tương tác xanh dương (`#2563EB`), cùng bộ màu ngữ nghĩa kèm nhãn văn bản tường minh cho kết quả review: Đỏ Crimson (`#DC2626` — Critical), Vàng Amber (`#D97706` — Warning), Xanh Emerald (`#16A34A` — Passed/Compliant).
  - *Typography & Hierarchy (2+1 Font Rule)*:
    - **Display & Navigation**: `Plus Jakarta Sans` (SemiBold/Bold 600–700) cho tiêu đề khu vực và thanh điều hướng.
    - **Body Prose & RAG Citations**: `DM Sans` (Regular 400 / Medium 500, 14px–15px, line-height 1.6) giúp đọc tài liệu dài và giải thích lỗi không mỏi mắt.
    - **Code, Diffs & Tabular Telemetry**: `JetBrains Mono` với thuộc tính `font-variant-numeric: tabular-nums` cho toàn bộ số dòng code, điểm số độ khớp Cosine (`96.4%`), thời gian phản hồi và khung so sánh Diff.
  - *Component Styling & Layout*:
    - Tuân thủ **Top Bar Contract** gọn gàng, một dòng duy nhất cho các nhãn nút điều khiển (`whitespace-nowrap`).
    - Metadata tĩnh (số trang, tên model, thời gian xử lý, độ tương đồng vector) được trình bày dạng văn bản phẳng ngăn cách bằng dấu chấm giữa (`·`) hoặc gạch chéo (`/`).

- **Interactive Feedback & Motion**:
  - Phản hồi chuyển đổi model, lọc mức độ lỗi (`All`, `Critical`, `Warning`, `Suggestion`) và chuyển tab diễn ra tức thời ($\le 150\text{ms}$).
  - Cung cấp đầy đủ 4 trạng thái cho cả khung RAG và khung Code Review: **Empty State**, **Loading Skeleton** (*Retrieving RAG Standards → Running Agents → Generating Patch*), **Populated State**, và **Error State**.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Khắc phục Dev Server bằng Kiến trúc Khởi chạy Kép (Unified Port 3000 Dev Server + Modular FastAPI Folder)**
  - *Chosen Approach*:
    1. Cấu hình trình khởi chạy tại thư mục gốc để `npm run dev` luôn phục vụ giao diện React Frontend kết hợp các route API (`/api/*`) trên cổng `0.0.0.0:3000` (đáp ứng yêu cầu bắt buộc của môi trường Preview).
    2. Đồng thời tổ chức đầy đủ thư mục dịch vụ FastAPI độc lập (cổng `8000`) chứa toàn bộ kiến trúc Multi-Model Router, Hybrid RAG và Multi-Agent Code Review để sẵn sàng chạy trong Docker Compose hoặc gọi từ Spring Boot Backend.
  - *Why*: Vừa giải quyết dứt điểm lỗi *"The dev server didn't start"* ngay lập tức trên trình duyệt, vừa giữ nguyên kiến trúc tách lớp chuẩn mực để FE hoặc BE gọi tới như bạn yêu cầu.
  - *Alternatives Considered*: Chỉ viết mỗi file thiết kế hoặc chỉ để code trong thư mục con mà không nối cổng `3000` ở thư mục gốc — sẽ khiến trình duyệt báo lỗi không tìm thấy Dev Server.

- **Decision 2: Thiết kế Unified LLM Provider Factory & Model Registry**
  - *Chosen Approach*: Xây dựng tầng trừu tượng hóa `LLMRouterService` quản lý danh mục model tập trung (`provider`, `model_id`, `temperature`, `thinking_level`, `max_context`). Mọi tác vụ từ RAG Chat, Context Compression, Flashcard/Exam cho tới từng Agent trong Code Review đều nhận instance LLM thông qua Router này dựa trên `model_id` được truyền vào payload request.
  - *Why*: Cho phép người dùng đổi model ngay giữa cuộc hội thoại hoặc gán các model khác nhau cho từng bước trong pipeline (ví dụ: dùng `gemini-3.8-flash` hoặc `llama-3.3-70b-versatile` để nén ngữ cảnh RAG siêu tốc, nhưng dùng `gemini-4-argon` hoặc `deepseek-r1-distill-llama-70b` để phân tích lỗi kiến trúc phức tạp).
  - *Alternatives Considered*: Khởi tạo cố định một biến toàn cục `llm = ChatGroq(...)` như trong file `app.py` hiện tại — cách cũ này khiến hệ thống bị khóa cứng vào một model duy nhất và crash ngay khi thiếu `st.secrets`.

- **Decision 3: Kiến trúc RAG Đa Không Gian Tên (Multi-Collection / Namespace Hybrid Index)**
  - *Chosen Approach*: Mở rộng bộ `FAISS + BM25 EnsembleRetriever` hiện có thành kiến trúc quản lý theo `document_id` và `collection_type` (`study_docs` cho đọc hiểu tài liệu chung và `engineering_standards` cho tài liệu quy chuẩn code/kiến trúc), đồng thời lưu trữ bền vững trên đĩa (`vector_store`) kèm bộ nhớ đệm LRU trên RAM.
  - *Why*: Giúp tái sử dụng 100% sức mạnh của thuật toán Hybrid Search (kết hợp tìm kiếm từ khóa chính xác BM25 cho tên hàm/tên quy tắc và tìm kiếm ngữ nghĩa Vector cho khái niệm kiến trúc) cho cả hai mục đích: trả lời câu hỏi tài liệu và tra cứu quy tắc khi review code.
  - *Alternatives Considered*: Tách riêng hai cơ sở dữ liệu vector cho RAG và Code Review — gây tốn gấp đôi bộ nhớ cho model Embedding và trùng lặp pipeline tiền xử lý PDF/Markdown.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                     PREVIEW & CLIENT LAYER (Port 3000 - 0.0.0.0)                         │
│                                                                                          │
│  ┌────────────────────────────────────────┐   ┌────────────────────────────────────────┐ │
│  │        DEVELOPER HUB (React UI)        │   │         ACADEMY HUB (React UI)         │ │
│  │  • Workbench IDE & Diff Viewer         │   │  • Document Reader & Citation Explorer │ │
│  │  • Multi-Agent Workflow Canvas         │   │  • Multi-Turn RAG Conversation         │ │
│  │  • Dynamic Model Selector Bar          │   │  • Flashcard & Exam Studio             │ │
│  └───────────────────┬────────────────────┘   └───────────────────┬────────────────────┘ │
└──────────────────────┼────────────────────────────────────────────┼──────────────────────┘
                       │ REST / JSON / SSE (/api/*)                 │ REST / JSON (/api/*)
                       ▼                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│               API GATEWAY / DEV SERVER BRIDGE (Port 3000) & SPRING BOOT (8080)           │
│  • Serves Vite React Frontend on 0.0.0.0:3000                                            │
│  • Proxies or executes /api/rag/*, /api/documents/*, /api/code-review/*, /api/models     │
│  • Compatible with Spring Boot RagController, DocumentRagController & RagFastApiClient   │
└──────────────────────────────────────────────┬───────────────────────────────────────────┘
                                               │ HTTP Internal / Direct API Call
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED FASTAPI AI ENGINE (Port 8000)                             │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        1. API ROUTER & CONTROLLER LAYER                            │  │
│  │  • /api/health                 • /api/models (List & Verify Providers)             │  │
│  │  • /api/documents/upload       • /api/chat/sessions/{id}/messages (RAG Q&A)        │  │
│  │  • /api/studio/flashcards|exam • /api/code-review/analyze (Single & Multi-Agent)   │  │
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
│  │  │  • gemini-4-argon (Gemini 3.1 Pro)      │   │  • llama-3.3-70b-versatile      │ │  │
│  │  │  • gemini-flash-latest (Gemini 3 Flash) │   │  • deepseek-r1-distill-llama-70b│ │  │
│  │  │  • Structured Schema & Thinking Config  │   │  • mixtral-8x7b-32768           │ │  │
│  │  └─────────────────────────────────────────┘   └─────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State

1. **Model Configuration & Registry (`ModelSpec`)**:
   - `id`: Mã định danh model chuẩn (`gemini-4-argon`, `gemini-flash-latest`, `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`, `mixtral-8x7b-32768`).
   - `provider`: `"google_gemini"` | `"groq"`.
   - `display_name`: Tên hiển thị trên UI kèm nhãn tốc độ/năng lực suy luận.
   - `capabilities`: Hỗ trợ Structured JSON, Thinking Mode, Context Window, và vai trò khuyến nghị (`code_review_deep`, `rag_fast_chat`, `context_compression`).

2. **Document & Hybrid Index Store (`DocumentIndexRecord`)**:
   - `document_id`: UUID định danh tài liệu.
   - `filename`, `collection_type` (`study_document` | `coding_standard`), `chunk_count`, `created_at`.
   - `faiss_index_path`: Đường dẫn lưu trữ FAISS vector index dưới đĩa.
   - `chunks_metadata`: Danh sách các đoạn văn bản đã băm kèm số trang (`page`), vị trí đoạn và điểm khóa phục vụ khởi tạo nhanh `BM25Retriever` khi kết hợp Hybrid Search.

3. **RAG Session & Conversation State (`RagSessionState`)**:
   - `session_id`: Mã phiên làm việc (tương thích hoàn toàn với `RagFastApiClient.java` của Spring Boot).
   - `active_document_ids`: Danh sách tài liệu được gắn vào phiên hỏi đáp.
   - `selected_model`: Model đang được chọn cho phiên hiện tại.
   - `messages`: Lịch sử hội thoại gồm `role`, `content`, `model_used`, `citations` (danh sách trang, đoạn trích và điểm tương đồng).

4. **Code Review Request & Structured Report (`CodeReviewPayload` & `CodeReviewResult`)**:
   - **Input (`CodeReviewPayload`)**:
     - `code_content` hoặc `git_diff`: Nội dung code hoặc bản diff cần đánh giá.
     - `language`: Ngôn ngữ lập trình (Java, Python, JavaScript/React, SQL, v.v.).
     - `model_id`: Model chính dùng để điều phối hoặc map cấu hình model cho từng Agent.
     - `execution_mode`: `"single_pass"` (review nhanh 1 bước) hoặc `"multi_agent_pipeline"` (chạy 4 Agent chuyên sâu tương ứng với Canvas).
     - `standard_document_ids`: Danh sách ID các tài liệu quy chuẩn kiến trúc/coding convention trong kho RAG cần dùng làm căn cứ đối chiếu.
   - **Output (`CodeReviewResult`)**:
     - `overall_score`: Điểm chất lượng (thang 0–100) kèm mức xếp hạng (`A`, `B`, `C`, `D`).
     - `summary`: Tóm tắt tổng quan những điểm mạnh và rủi ro lớn nhất.
     - `findings`: Danh sách phát hiện chi tiết (`id`, `severity`, `category`, `line_start`, `line_end`, `title`, `description`, `rag_rule_citation`, `original_snippet`, `suggested_fix`).
     - `refactored_code`: Bản code hoàn chỉnh sau khi áp dụng các đề xuất sửa chữa quan trọng.
     - `agent_traces`: Nhật ký thực thi của từng Agent (`agent_name`, `role`, `model_used`, `duration_ms`, `findings_count`, `status`) để hiển thị trực tiếp lên **Workbench Canvas**.

#### Interactive Component & State Mapping

| Thành phần Hệ thống / Giao diện | Sự kiện đầu vào / API Call | Luồng biến đổi trạng thái & Xử lý Backend | Kết quả trả về & Phản hồi UI |
| :--- | :--- | :--- | :--- |
| **Dev Server & Preview Gateway (`0.0.0.0:3000`)** | Khởi chạy `npm run dev` tại thư mục gốc | Khởi động Express + Vite Middleware trên cổng `3000`, phục vụ giao diện React và gắn kết các endpoint `/api/*` tới AI Engine (cùng cơ chế khởi chạy FastAPI nền). | Ứng dụng mở lên ngay lập tức tại cổng `3000`, không còn lỗi mất kết nối Dev Server. |
| **Model Selector (`GET /api/models`)** | Người dùng mở menu chọn model trên Workbench hoặc khung Chat RAG | Kiểm tra trạng thái sẵn sàng của `GEMINI_API_KEY` / `GOOGLE_API_KEY` và `GROQ_API_KEY` trên server, trả về danh sách các model khả dụng từ Gemini và Groq. | Hiển thị danh sách model phân nhóm theo nhà cung cấp, đánh dấu model đang chọn và áp dụng ngay cho câu lệnh tiếp theo. |
| **Document Upload & Indexing (`POST /api/documents/upload`)** | Tải file PDF/Markdown từ Academy Hub hoặc Developer Hub (hoặc qua `DocumentRagController` của Spring Boot) | Trích xuất văn bản theo trang → Chạy `chunk_documents` theo chế độ (`chat` hoặc `coding_standard`) → Tạo FAISS index + BM25 corpus → Lưu bền vững vào `data/vector_store/{doc_id}`. | Trả về `document_id`, `chunk_count`, `status: READY`. Cập nhật danh sách tài liệu nguồn để sẵn sàng cho cả hỏi đáp RAG và đối chiếu Code Review. |
| **Multi-Model RAG Chat (`POST /api/chat/sessions/{id}/messages`)** | Gửi câu hỏi kèm `document_id` và `model_id` (tương thích ngược 100% với `RagFastApiClient` hiện tại) | 1. Lấy instance LLM từ `MultiModelRouter(model_id)`<br>2. `rephrase_question` dựa trên lịch sử phiên<br>3. Truy xuất `TopKEnsembleRetriever` (BM25 + FAISS)<br>4. `compress_context` lọc đoạn văn sát nghĩa<br>5. Sinh câu trả lời kèm trích dẫn trang. | Trả về câu trả lời, danh sách trích dẫn chi tiết (`page`, `snippet`, `score`) và thông tin model đã xử lý. |
| **RAG-Grounded Code Review (`POST /api/code-review/analyze`)** | Gửi file code / Git diff, chọn `model_id`, chọn chế độ `single_pass` hoặc `multi_agent_pipeline` và tài liệu quy chuẩn RAG | 1. Phân tích cấu trúc code & đánh số dòng<br>2. Nếu có `standard_document_ids`, truy xuất Hybrid RAG để lấy các quy tắc kiến trúc/coding standard liên quan đến ngữ cảnh file code<br>3. Điều phối các Agent chuyên biệt qua `MultiModelRouter`<br>4. Tổng hợp kết quả theo JSON Schema chuẩn. | Hiển thị điểm số, danh sách lỗi gắn theo dòng code, trích dẫn quy chuẩn từ tài liệu PDF, đoạn code sửa gợi ý (Diff Patch) và cập nhật trạng thái từng Node trên Canvas. |
| **Study Studio (`POST /api/studio/flashcards` & `/exam`)** | Yêu cầu tạo bộ Flashcard hoặc Đề thi trắc nghiệm từ tài liệu đã tải lên | Nạp các chunk theo chiến lược `flashcard`/`exam`, gọi model được chọn qua `MultiModelRouter` và chuẩn hóa kết quả JSON. | Hiển thị bộ thẻ lật Flashcard hoặc bài kiểm tra trắc nghiệm tương tác trên giao diện học tập. |

#### Key Sequences & Integrations

1. **Khắc Phục Lỗi Khởi Động Dev Server (Port 3000 Boot Pipeline)**:
   - Thiết lập cấu hình khởi chạy ở thư mục gốc liên kết trực tiếp với ứng dụng React trong `frontend/` và lắng nghe trên `0.0.0.0:3000`.
   - Khắc phục lỗi đọc biến môi trường trong `app.py` (dùng `os.getenv("GROQ_API_KEY")` an toàn thay vì gọi cứng `st.secrets["GROQ_API_KEY"]` gây sập tiến trình khi chưa có file `.streamlit/secrets.toml`).
   - Đóng gói trọn vẹn dịch vụ FastAPI trong thư mục riêng (`rag_fastapi/`) khớp với đường dẫn trong `docker-compose.yml` (`dockerfile: rag_fastapi/Dockerfile`).

2. **Thiết kế Bộ Định Tuyến Đa Mô Hình (`MultiModelRouter`)**:
   - Với nhánh **Google Gemini**: Hỗ trợ `gemini-4-argon` (Gemini 3.1 Pro) và `gemini-flash-latest` / `gemini-3.8-flash` (Gemini 3 Flash) qua SDK chính thức ở phía server (`@google/genai` / `google-genai`), truyền cấu hình `temperature`, `systemInstruction`, và `responseMimeType = "application/json"` khi chạy tác vụ Code Review.
   - Với nhánh **Groq**: Hỗ trợ `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`, và `deepseek-r1-distill-llama-70b` (tự động bóc tách thẻ `<think>...</think>` của DeepSeek R1 thành trường `reasoning_trace` riêng biệt để giao diện có thể ẩn/hiện phần suy luận).
   - Cơ chế **Smart Fallback**: Tự động chuyển đổi sang model dự phòng khả dụng nếu một nhà cung cấp chưa được cấu hình khóa API hoặc gặp giới hạn băng thông.

3. **Luồng Phối Hợp Giữa RAG và Multi-Agent Code Review**:
   - **Bước 1 (Code Context Extraction)**: Phân tích chữ ký hàm, các thư viện import và mẫu thiết kế trong đoạn code gửi lên để tạo truy vấn ngữ nghĩa.
   - **Bước 2 (RAG Rule Grounding)**: Đưa truy vấn vào `TopKEnsembleRetriever` trên tập tài liệu quy chuẩn (`standard_document_ids`) để rút trích các quy định cụ thể của dự án.
   - **Bước 3 (Multi-Agent Execution)**: Điều phối 4 Agent (`Architect & Convention Reviewer`, `Security Auditor`, `Performance & Maintainability Reviewer`, `Lead Synthesizer & Patch Generator`) và trả về báo cáo JSON chuẩn hóa choทั้ง Frontend và Spring Boot Backend.
