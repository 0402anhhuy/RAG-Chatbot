# `app/core` — Hạ tầng dùng chung (cross-cutting concerns)

## Chức năng

Chứa các thành phần hạ tầng **không thuộc domain RAG** nhưng mọi request/service cần:
context theo request, error envelope, logging, middleware, rate limit, auth, validate upload,
truy cập Spring backend, và các helper cho quality/rollout.

Toàn bộ service **không sở hữu database quan hệ**. Document, chunk và ingest-job được lưu ở
Spring backend; `app/core/backend_client.py` là nơi duy nhất biết cách gọi các endpoint
`/api/rag/*` đó.

## Pipeline hiện tại

Thứ tự middleware khi một request HTTP đi vào (đăng ký ở `app/main.py`):

```
Client
  │  (X-Request-ID nếu là UUID, ngược lại sinh UUID mới)
  ▼
RequestContextMiddleware   ← gắn request_id vào ContextVar, log access + latency, thêm header ra response
  ▼
RateLimitMiddleware        ← fixed-window theo IP client, chỉ áp cho path bắt đầu "/api/"
  ▼
CORSMiddleware             ← allowlist origin, không cho credentials
  ▼
Route + dependency require_api_key (so sánh hằng số bằng secrets.compare_digest)
  ▼
ApiError / RequestValidationError / HTTPException / Exception
  ▼
Error handler → envelope {success:false, error:{code,message,details,request_id}}
```

## Các file

| File                | Vai trò                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__init__.py`       | Marker package.                                                                                                                                                                                                                                                                                            |
| `context.py`        | `request_id_context: ContextVar[str]` — chia sẻ request-id giữa middleware, logging và response.                                                                                                                                                                                                           |
| `errors.py`         | Enum `ErrorCode`, exception `ApiError`, hàm `error_payload`, và `install_error_handlers(app)` map mọi loại lỗi (kể cả `RequestValidationError`, `StarletteHTTPException`, lỗi không lường trước) sang envelope chuẩn.                                                                                      |
| `logging.py`        | `setup_logging()` cấu hình root logger; `JsonFormatter` (một dòng JSON, tự thêm `request_id`) và `TextFormatter`; `_safe_value` redact các key nhạy cảm (`api_key`, `authorization`, `token`…) và pattern secret (`sk-`, `gsk_`, `AIza`…).                                                                 |
| `middleware.py`     | `RequestContextMiddleware` (ASGI thuần): validate/khởi tạo request-id, gắn vào context & scope state, thêm header response, log `http_request_complete` kèm method/path/status/latency, và bắt exception chưa xử lý để trả 500 an toàn.                                                                    |
| `ratelimit.py`      | `RateLimitMiddleware` + hai store: `MemoryRateLimitStore` (per-process, dọn window cũ) và `RedisRateLimitStore` (script Lua INCR+EXPIRE, key băm SHA-256). Trả 429 kèm `Retry-After`, hoặc 503 nếu Redis lỗi.                                                                                              |
| `security.py`       | Dependency `require_api_key`: nếu security tắt và env là dev/test thì bỏ qua; ngược lại so khớp `X-API-Key` với `security.api_key` + mọi `security.api_keys` bằng `secrets.compare_digest`. Sai → 401 `AUTH_ERROR`.                                                                                        |
| `upload_policy.py`  | `validate_upload_file()`: kiểm tra filename không rỗng, file không rỗng, không vượt `max_size_bytes`, không chứa `..` / path traversal, và extension thuộc allowlist.                                                                                                                                      |
| `backend_client.py` | `BackendRegistry` — HTTP client typed (httpx) tới Spring: document (register/get/list/status/jobId/delete), chunk (replace/list/count), ingest job (create/get/reserve next/update/recover), study context (`document_context`). Exception `BackendUnavailable` (lỗi 5xx/mạng) và `BackendNotFound` (404). |
| `quality.py`        | `evaluate_retrieval_quality()` + `QualityGateResult`: tính average score, hit rate, số grounded document theo threshold và trả `passed` — dùng cho evaluation/quality gate local.                                                                                                                          |
| `rollout.py`        | `compare_migration_parity()` và `build_rollout_plan()`: so bộ file migration `.sql` trên đĩa với version đã apply, sinh sequence nâng cấp và rollback an toàn cho cutover.                                                                                                                                 |

## Điểm cần lưu ý

- `@lru_cache` không nằm ở đây nhưng `create_app()` trong `app/main.py` dùng `get_settings()`
  đã cache đó; helper quality/rollout là hàm thuần, dễ test.
- `rate_limit.py` và `logging.py` import config settings, nên `app/core` phụ thuộc `config/`.
- `rollout.py` độc lập với phần còn lại (chỉ dùng `pathlib`) — có thể chạy trong script vận hành.
