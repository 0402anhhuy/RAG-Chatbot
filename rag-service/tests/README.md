# `tests` — Bộ kiểm thử RAG service

## Chức năng

Kiểm thử unit + integration theo tinh thần **offline**: dùng `MockLLM`, `DummyEmbeddingModel`,
`InMemoryVectorStore` và Spring backend giả (hoặc TestClient) để không cần network/credential thật.

## Pipeline chạy test

```
pytest (cấu hình trong pyproject.toml: testpaths=["tests"], pythonpath=["."], asyncio_mode="auto")
  ├─ unit: hashing / splitters / loaders / fusions / stores / settings / quality
  ├─ workflow: RAGWorkflow với MockLLM (generate, fallback, citation)
  ├─ API: create_app(custom Settings) + TestClient → chat, SSE, upload, job status, delete
  └─ integration: ingest → index rebuild → retrieval/chat; study generation
```

`Settings(_env_file=None, ...)` được build trong test để bỏ `.env` và trỏ về `tmp_path` cho
upload/bm25/db.

## Các file

| File                         | Phạm vi                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `__init__.py`                | Marker package.                                                                                               |
| `test_core.py`               | Health probe, request-id (UUID hoặc sinh mới), rate-limit cho API path, auth key, JSON log redaction.         |
| `test_settings.py`           | Validator settings (production guardrails, cors, retrieval weights, rate-limit redis).                        |
| `test_domain_model.py`       | Dataclass domain và helper định danh (`make_chunk_id` ổn định).                                               |
| `test_retrieval.py`          | Loader, chunking overlap, BM25 persist/search, RRF/weighted fusion, rerank, `HybridRetriever`.                |
| `test_store_contract.py`     | Hành vi chung `VectorStorePort` trên in-memory/qdrant/faiss + filter metadata.                                |
| `test_rag_flow.py`           | Mock workflow sinh câu trả lời + citation, fallback khi không có tài liệu, yêu cầu API key cho provider thật. |
| `test_document_ingestion.py` | Build chunk từ file, upload workflow, trạng thái document/job.                                                |
| `test_ingest_recovery.py`    | Stale job recovery, retry budget, delete cleanup.                                                             |
| `test_api_phase8.py`         | `/chat/completions`, `/chat/stream`, upload (202/200/waitUntilReady), list/get/delete.                        |
| `test_study_generation.py`   | Flashcard/exam với MockLLM: JSON hợp lệ, provenance, validate lựa chọn.                                       |
| `test_phase9_quality.py`     | `evaluate_retrieval_quality`, `validate_upload_file` (size/ext/traversal).                                    |
| `test_phase10_container.py`  | Kiểm tra Dockerfile/healthcheck contract nếu có.                                                              |
| `test_legacy_migration.py`   | Helper parity/rollback trong `app/core/rollout.py`.                                                           |
| `test_database.py`           | Test cho module DB di sản (có thể không còn dùng bởi code chính).                                             |
| `test_docs_index_links.py`   | Mọi link trong `docs/index.md` phải trỏ tới file tồn tại.                                                     |

## Điểm cần lưu ý

- Test dùng mock, nên **không đảm bảo chất lượng câu trả lời thật**; cần live-provider eval cho
  sign-off chất lượng.
- Một số test còn tham chiếu `DatabaseSettings`/`IngestSettings.queue_path` (di sản SQLite) — khi
  dọn dẹp code cũ nên cập nhật các test tương ứng.
