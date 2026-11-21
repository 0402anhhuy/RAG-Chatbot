# `app/api` — Lớp HTTP (transport layer)

## Chức năng

Định nghĩa toàn bộ HTTP route của RAG service bằng FastAPI. Đây là lớp **mỏng nhất**:
nó chỉ làm 4 việc:

1. Parse + validate request (Pydantic model).
2. Xác thực hằng số/khóa bằng dependency `require_api_key` (header `X-API-Key`).
3. Gọi xuống domain layer (`app.rag.*`) hoặc Spring backend (`app.core.backend_client`).
4. Bọc kết quả vào envelope chuẩn `{success, data, request_id}` và map lỗi sang
   `ApiError` / `ErrorCode` (`app/core/errors.py`).

Không có logic nghiệp vụ RAG (chunking, retrieval, prompt) nằm ở đây. Toàn bộ route được
mount dưới prefix `/api/v1` từ `app/main.py`.

## Pipeline hiện tại

```
Khởi động: app/main.py include_router(api/v1/router.py, prefix="/api/v1")
                                    │
                                    ▼
                       api/v1/router.py (gộp 5 router)
        ┌───────────┬──────────────┬──────────────┐
        ▼           ▼              ▼              ▼              ▼
     health.py   chat.py     documents.py   retrieval.py     study.py
     (public)   (API key)     (API key)      (API key)      (API key)
```

Mỗi request đi qua middleware ở `app/core` (request-id → CORS → rate-limit), sau đó vào
route. Các route chat/retrieval/study dùng đồng bộ các object đã build sẵn lúc startup
(`app.state.retriever`, `app.state.backend`, `app.state.ingest_queue`, …) và chạy tác vụ
nặng trong `asyncio.to_thread` để không block event loop.

## Các file

| File              | Vai trò                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__init__.py`     | Marker package.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `v1/__init__.py`  | Marker package cho API version 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `v1/router.py`    | Router gốc: import và `include_router` 5 router con (health, chat, documents, retrieval, study).                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `v1/health.py`    | `GET /health/liveness` (public, luôn `ok`) và `GET /health/readiness` (public; kiểm tra `app.state.ready` và gọi thử backend `list_documents(status="ready")`, trả 503 nếu không sẵn sàng).                                                                                                                                                                                                                                                                                                                                              |
| `v1/chat.py`      | `POST /chat/completions` (JSON) và `POST /chat/stream` (SSE). Định nghĩa `ChatRequest`/`ChatMessage`. Dựng `LLMFactory` + `RAGWorkflow` rồi chạy pipeline rewrite→retrieve→rerank→grade→generate/fallback; trả `answer`, `citations`, `execution_time_ms`. Stream phát sự kiện `metadata` → `token` (chia theo khoảng trắng) → `citations` → `done`.                                                                                                                                                                                     |
| `v1/documents.py` | Nhóm endpoint quản lý tài liệu: `POST /documents/upload` (multipart), `GET /documents`, `GET /documents/jobs/{job_id}`, `DELETE /documents/{document_id}`. Chịu trách nhiệm: validate file (size/extension/path-traversal), tính checksum SHA-256, dedup theo checksum trong workspace, ghi file vào `upload.directory`, đăng ký document + tạo ingest job qua backend, và hỗ trợ `waitUntilReady` (poll job tới khi `ready`/`failed`/timeout). Xóa document sẽ xóa record backend, xóa job, rồi gọi worker để xóa file + rebuild index. |
| `v1/retrieval.py` | `POST /retrieval/search`: chạy `HybridRetriever.search` với filter `workspaceId` + `documentIds`, trả danh sách chunk đã rank.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `v1/study.py`     | `POST /study/flashcards` và `POST /study/exams`: lấy context các document đã `ready` từ backend (`document_context`), gọi LLM sinh JSON có cấu trúc (flashcard: `question/answer/source_chunk_id`; exam: 4 lựa chọn A–D + đáp án), validate chặt và retry tối đa 2 lần. Gắn `document_id`, `chunk_id`, `page` vào từng item.                                                                                                                                                                                                             |

## Điểm cần lưu ý

- `documents.py` là route duy nhất có **side effect ghi file** và phụ thuộc network tới
  Spring backend; các lỗi transport được map thành 503/404/502 (`_backend` helper).
- `chat.py` hiện **không stream thật** từ LLM: câu trả lời được tạo đầy đủ trước rồi mới
  chia token để phát SSE.
- Response luôn chứa `request_id` lấy từ `request_id_context` của middleware.
