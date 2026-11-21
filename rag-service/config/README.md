# `config` — Cấu hình service

## Chức năng

Nạp, validate và cung cấp **một** instance `Settings` cho toàn bộ service. Cấu hình đến từ
3 nguồn (theo thứ tự ưu tiên tăng dần): giá trị mặc định trong model → biến môi trường →
file `.env` → `settings.yaml` → secret file.

`Settings` phủ các nhóm: `app`, `security`, `rate_limit`, `embedding`, `vector_store`,
`retrieval`, `bm25`, `llm`, `prompts`, `graph`, `reranker`, `ingest`, `upload`, `backend`.

## Pipeline hiện tại

```
app/main.py: create_app()
    settings = get_settings()                 (@lru_cache → 1 instance/process)
        │  Settings.settings_customise_sources()
        │    init → env → .env → settings.yaml → file_secret
        ▼
    validate theo model (validator từng field + model_validator)
        - production: cấm security tắt, cấm wildcard CORS, cấm mock/dummy,
          bắt buộc API key ≥ 32 ký tự và key cho LLM/embedding hosted
        ▼
    settings → BackendRegistry, EmbeddingFactory, create_vector_store,
                DurableIngestQueue, DocumentIngestWorker, HybridRetriever,
                RateLimitMiddleware, CORS, prompts cho RAGWorkflow
```

Biến môi trường dùng dấu `__` lồng nhau (`APP__ENV`, `LLM__PROVIDER`, `RETRIEVAL__TOP_K_DENSE`…),
xem `.env.example`.

## Các file

| File            | Vai trò                                                                                                                                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__init__.py`   | Marker package.                                                                                                                                                                                                                                                                                                               |
| `settings.yaml` | Cấu hình mặc định theo môi trường dev: provider `dummy` embedding, `mock` LLM, vector store `in_memory`, retrieval RRF (top_k_dense/sparse 10, top_k 4), chunk 600/100, worker ingest bật, backend `http://localhost:8080`, kèm prompt template mặc định.                                                                     |
| `settings.py`   | Định nghĩa các `BaseModel` con (mỗi nhóm có validator riêng, ví dụ `rate_limit` bắt buộc `redis_url` khi bật Redis; `retrieval` kiểm tra trọng số weighted cộng lại = 1; `app.cors_origins` phải là origin hợp lệ), class `Settings` gom tất cả và `get_settings()` cache 1 lần. Secret dùng `SecretStr` để không lộ khi log. |

## Điểm cần lưu ý

- `settings.py` import `YamlConfigSettingsSource` từ `pydantic-settings` → bắt buộc có `PyYAML`.
- `app.state.settings` được set trong `create_app`; test tạo `Settings(_env_file=None, ...)` để
  bỏ qua `.env` và override bằng tham số.
- Thay đổi `vector_store.backend`/`ingest.worker_enabled`/`embedding.provider` ảnh hưởng trực
  tiếp cách khởi động (`worker.prepare` vs `worker.rebuild_indexes`); xem
  `docs/guides/configuration.md`.
- `ingest.queue_path` và `database.path` còn xuất hiện trong `.env.example`/test (di sản thời
  SQLite); trong code hiện tại **job/document state đã chuyển sang Spring backend**, các field
  đó không còn trong `IngestSettings`/`Settings` hiện hành.
