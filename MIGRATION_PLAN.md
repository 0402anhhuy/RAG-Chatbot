# Plan: Migrate Streamlit to React + FastAPI

## 1. Mục tiêu

Chuyển toàn bộ giao diện Streamlit hiện tại sang React frontend đang có, đồng thời tách phần gọi LLM/RAG thành FastAPI backend để React giao tiếp qua HTTP.

Luồng sau khi migrate:

```text
React UI
  -> FastAPI API
      -> RAG pipeline hiện có
          -> PDF loader / chunking / hybrid retrieval
          -> Groq chat model
          -> Flashcard / Exam generation
```

Streamlit sẽ được giữ lại trong giai đoạn chuyển tiếp để đối chiếu tính năng, sau đó có thể loại bỏ khỏi production.

---

## 2. Phạm vi cần chuyển

### Từ `app.py` và `app_local.py`

- Upload PDF.
- Process PDF:
  - Load PDF.
  - Chunk document.
  - Build vector store.
  - Build hybrid retriever gồm BM25 + vector search.
- Chat nhiều lượt.
- Rephrase câu hỏi dựa trên lịch sử hội thoại.
- Context compression.
- Generate câu trả lời có source pages.
- New chat.
- Chat history và mở lại hội thoại cũ.
- Reset session.
- Generate flashcards.
- Generate exam questions.
- Hiển thị kết quả flashcards/exam.
- Trạng thái processing, lỗi, empty state và thông báo thành công.

### Giao diện React đã có

- Login/register.
- Role-aware sidebar cho user/admin.
- User chat workspace.
- Admin workspace pages: Dashboard, Activity, Integrations, Team, Settings, Help.

Các màn hình trên sẽ được nối với API thật từng bước, thay cho dữ liệu mock hiện tại.

---

## 3. Kiến trúc thư mục đề xuất

```text
backend/
  __init__.py
  main.py                    # FastAPI app, CORS, router registration
  dependencies.py             # Session/auth dependency
  config.py                  # Environment configuration
  schemas/
    auth.py
    chat.py
    documents.py
    study.py
    workspace.py
  api/
    auth.py
    chat.py
    documents.py
    study.py
    workspace.py
  services/
    session_service.py        # Conversation/session state
    document_service.py       # Upload, indexing, document metadata
    rag_service.py            # Retrieval + answer generation
    study_service.py          # Flashcards + exam generation
  stores/
    session_store.py          # Initial in-memory store; replaceable later
    document_store.py         # Metadata/index references
  middleware/
    error_handler.py

frontend/src/
  api/
    client.js                 # Fetch wrapper, base URL, error normalization
    authApi.js
    chatApi.js
    documentApi.js
    studyApi.js
  hooks/
    useChat.js
    useDocuments.js
  pages/
    UserChat.jsx
    ...

# Existing modules reused by backend
loaders/
domain/
retrieval/
generation/
prompt/
utils/
```

### Ghi chú về state

Bản Streamlit dùng `st.session_state`, nên không thể gọi trực tiếp từ React. Giai đoạn đầu dùng `SessionStore` in-memory theo `session_id`; thiết kế interface độc lập để sau này thay bằng Redis/PostgreSQL mà không đổi API.

File index FAISS cần được quản lý theo `document_id` hoặc `workspace_id`, không dùng một biến global dùng chung cho mọi user.

---

## 4. API contract dự kiến

Base URL: `/api/v1`

### Auth

```http
POST /auth/login
POST /auth/register
POST /auth/logout
GET  /auth/me
```

Response login:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user": {
    "id": "user-id",
    "name": "Huy",
    "email": "huy@example.com",
    "role": "user"
  }
}
```

> Hiện frontend đang mock auth bằng email. Khi làm thật cần chuyển sang JWT hoặc session cookie phía backend; không dùng `localStorage` để lưu thông tin xác thực nhạy cảm trong production.

### Chat

```http
POST /chat/sessions
GET  /chat/sessions
GET  /chat/sessions/{session_id}
DELETE /chat/sessions/{session_id}
POST /chat/sessions/{session_id}/messages
```

Request gửi message:

```json
{
  "content": "Tóm tắt nội dung chính của tài liệu"
}
```

Response:

```json
{
  "session_id": "session-id",
  "user_message": {
    "role": "user",
    "content": "..."
  },
  "assistant_message": {
    "role": "assistant",
    "content": "...",
    "sources": [
      { "page": 3, "document_id": "doc-id" }
    ]
  }
}
```

Logic backend tương ứng với Streamlit:

1. Lấy lịch sử trước message hiện tại.
2. Gọi `rephrase_question()`.
3. Gọi retriever hybrid.
4. Gọi `compress_context()`.
5. Gọi `generate_answer()` với `get_chat_prompt()`.
6. Trả answer cùng source pages.
7. Persist cả user message và assistant message.

### Documents

```http
POST /documents/upload
POST /documents/{document_id}/process
GET  /documents
GET  /documents/{document_id}
DELETE /documents/{document_id}
```

Upload trả về `document_id` và trạng thái `uploaded`; process chuyển trạng thái sang `processing`, `ready` hoặc `failed`.

```json
{
  "id": "doc-id",
  "filename": "knowledge-base.pdf",
  "status": "ready",
  "page_count": 14,
  "chunk_count": 52,
  "created_at": "2026-09-04T..."
}
```

### Study tools

```http
POST /study/flashcards
POST /study/exams
GET  /study/flashcards/{job_id}
GET  /study/exams/{job_id}
```

Request tối thiểu:

```json
{
  "document_id": "doc-id",
  "max_items": 20
}
```

Response flashcard giữ các field hiện tại: `question`, `answer`, `page`.

Response exam giữ: `question`, `options`, `correct_answer`.

Giai đoạn đầu có thể xử lý đồng bộ; nếu generate lâu hơn giới hạn request thì chuyển sang job model với `job_id` và polling.

### Workspace/admin

```http
GET /workspace/overview
GET /workspace/activity
GET /workspace/integrations
GET /workspace/team
POST /workspace/team/invitations
GET /workspace/settings
PATCH /workspace/settings
```

Các endpoint này trước mắt trả dữ liệu thật từ document/session store hoặc dữ liệu cấu hình; không để UI phụ thuộc vào mock hard-code lâu dài.

---

## 5. Các thay đổi backend cần thực hiện

### Bước 1: Tách cấu hình

- Đưa `GROQ_API_KEY`, `CHAT_MODEL_GROQ`, `EMBEDDING_MODEL`, CORS origins vào `.env`.
- Dùng một config object thay cho `st.secrets`.
- Không log API key hoặc nội dung tài liệu nhạy cảm.
- Thêm giới hạn file size và chỉ cho phép PDF ở phase đầu.

### Bước 2: Tạo service layer

- Di chuyển logic xử lý PDF ra `document_service.py`.
- Di chuyển logic hỏi đáp ra `rag_service.py`.
- Di chuyển flashcard/exam ra `study_service.py`.
- Giữ các module `loaders`, `domain`, `retrieval`, `generation`, `prompt` làm domain logic dùng chung.
- Không import Streamlit trong bất kỳ service/API module nào.

### Bước 3: Quản lý session và document isolation

- Sinh `session_id`, `document_id`, `workspace_id`.
- Mỗi session chỉ được đọc document thuộc workspace/user tương ứng.
- Lưu metadata của document và trạng thái indexing.
- Không giữ vectorstore/retriever trong biến global duy nhất.

### Bước 4: FastAPI app

- Tạo `backend/main.py`.
- Cấu hình CORS cho Vite dev server và production domain.
- Thêm health endpoint: `GET /health`.
- Chuẩn hóa lỗi: validation, file type, processing failure, model timeout.
- Thêm request ID và logging cơ bản.

### Bước 5: Async/background processing

- Upload trả response nhanh.
- Processing PDF có thể chạy BackgroundTasks trước.
- Nếu deployment nhiều worker, chuyển job state sang Redis/database thay vì in-memory.
- LLM call cần timeout, retry có giới hạn và response lỗi dễ hiểu cho UI.

---

## 6. Các thay đổi frontend cần thực hiện

### API client

- Tạo fetch wrapper dùng `VITE_API_BASE_URL`.
- Chuẩn hóa xử lý HTTP error.
- Gắn auth token/cookie.
- Không để URL API rải rác trong component.

### User Chat

Thay mock trong `UserChat.jsx` bằng:

- Load document list từ `GET /documents`.
- Upload bằng `multipart/form-data`.
- Poll trạng thái process hoặc hiển thị trạng thái processing.
- Tạo/load chat session từ API.
- Gửi message tới FastAPI.
- Hiển thị source pages riêng dưới assistant message.
- New chat gọi API/archive session.
- History load từ API.
- Flashcards và Exam gọi study endpoints.
- Disable controls đúng theo document/session status.

### Login/register

- Thay `localStorage` role mock bằng auth API thật.
- Sau login gọi `/auth/me` hoặc dùng user trả về từ login.
- User route mặc định `/chat`.
- Admin route mặc định `/admin`.
- Thêm route guard cho role, tránh user truy cập admin URL trực tiếp.
- Logout gọi API rồi xóa client session.

### Admin pages

- Dashboard lấy metrics thật.
- Activity lấy event thật.
- Integrations hiển thị config/provider state.
- Team lấy member list và invite API.
- Settings đọc/ghi API.
- Help có thể giữ static content ở phase đầu.

---

## 7. Thứ tự triển khai đề xuất

### Phase 0: Chuẩn bị

- Chốt API base URL và auth strategy.
- Chốt nơi lưu uploads, FAISS index và metadata.
- Thêm `backend/` nhưng chưa bỏ Streamlit.

### Phase 1: Backend skeleton

- FastAPI app.
- CORS.
- `/health`.
- Config từ environment.
- Error handling.
- Session store interface.

### Phase 2: Document pipeline

- Upload PDF.
- Process PDF.
- Document status/list.
- Persist index reference.
- Test độc lập với UI.

### Phase 3: Chat API

- Create/list/load session.
- Message endpoint.
- Port toàn bộ pipeline rephrase -> retrieve -> compress -> answer.
- Source metadata.
- Test multi-turn conversation.

### Phase 4: React user flow

- API client.
- Auth integration.
- Replace mock upload/chat/history trong `UserChat.jsx`.
- Flashcards/exam integration.
- Loading/error/empty states.

### Phase 5: Admin flow

- Dashboard/activity thật.
- Team/invite thật.
- Settings thật.
- Role guards.

### Phase 6: Deployment

- Thêm FastAPI service vào `docker-compose.yml`.
- Frontend build/static hosting hoặc frontend container.
- Đổi healthcheck từ Streamlit sang `/health`.
- Cập nhật Dockerfile/README.
- Xác nhận Streamlit chỉ còn legacy hoặc đã xóa theo quyết định cuối.

---

## 8. Docker/deployment plan

### Development

```text
frontend: Vite dev server :5173
backend: Uvicorn :8000
```

Frontend dùng:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Docker Compose dự kiến

```text
services:
  api:
    build: ./backend
    ports: 8000:8000
    env_file: .env
    volumes:
      - ./pdfs:/app/pdfs
      - ./faiss_index:/app/faiss_index

  frontend:
    build: ./frontend
    ports:
      - 5173:80
    depends_on:
      - api
```

Có thể giữ service Streamlit trong compose một thời gian với profile `legacy`, phục vụ so sánh trước khi xóa.

---

## 9. Kiểm thử và nghiệm thu

### Backend tests

- Upload file hợp lệ.
- Từ chối file không phải PDF.
- Process PDF tạo đúng chunk/index.
- Chat không có document trả lỗi rõ ràng.
- Chat nhiều lượt rephrase đúng history.
- Response có source pages.
- Flashcard JSON invalid được xử lý thành lỗi API.
- Exam options/correct answer vẫn hợp lệ.
- User không truy cập document/session của user khác.
- Admin/user route authorization.

### Frontend checks

- Login user -> chat user sidebar.
- Login admin -> admin sidebar.
- Refresh trang vẫn giữ session hợp lệ.
- Upload -> processing -> ready.
- Gửi prompt và nhận assistant response.
- New chat/history.
- Flashcard/exam loading và error state.
- Logout quay về login.
- Mobile layout.

### Acceptance criteria

- Không còn logic gọi model trực tiếp trong React.
- React không import hoặc phụ thuộc Streamlit.
- FastAPI gọi được toàn bộ pipeline RAG hiện tại.
- User và admin có sidebar/route đúng role.
- Có source citations trong câu trả lời.
- Một tài liệu/session không bị chia sẻ nhầm giữa các user.
- `npm run lint`, `npm run build` pass.
- Backend có test cho các API cốt lõi.
- Docker Compose chạy được frontend + API.

---

## 10. Quyết định cần xác nhận trước khi code

1. Dùng auth thật nào: JWT hay cookie session?
2. Session/document store phase đầu dùng in-memory hay SQLite?
3. Có cần streaming token cho chat hay response đầy đủ là đủ ở phase đầu?
4. FAISS index lưu theo workspace/document như thế nào khi nhiều user cùng chạy?
5. Có tiếp tục giữ Streamlit legacy trong production trong thời gian chuyển đổi không?
6. Flashcard/exam xử lý đồng bộ hay chuyển sang background job ngay từ đầu?
7. Frontend production deploy riêng hay FastAPI serve static build React?

## Đề xuất mặc định

- JWT access token ngắn hạn + refresh cookie nếu chưa có hệ thống auth.
- SQLite lưu metadata/session ở phase đầu; FAISS lưu theo `workspace_id`.
- Chat response đầy đủ trước, streaming làm phase sau.
- FastAPI BackgroundTasks cho process/generate; Redis/Celery khi cần scale nhiều worker.
- Giữ Streamlit bằng compose profile `legacy` cho đến khi React flow đạt acceptance criteria.
