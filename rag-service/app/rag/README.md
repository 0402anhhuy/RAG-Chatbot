# `app/rag` — Domain layer RAG

## Chức năng

Đây là **lõi nghiệp vụ** của service: biến file tài liệu thành chunk có định danh ổn định,
đánh index (sparse BM25 + dense vector), truy xuất hybrid, chạy RAG graph (rewrite → retrieve
→ rerank → grade → generate/fallback), và là nơi chứa các subpackage chuyên biệt.

Package cũng là entrypoint re-export các API ổn định (xem `__init__.py`): `RAGWorkflow`,
`IngestJob`, `DocumentChunk`, `BM25Index`, `HybridRetriever` (được import từ `retrievers.service`
ở `app/main.py`), `EmbeddingFactory`, `LLMFactory`, `chunk_text`, `fuse_results`, `rerank_results`…

## Pipeline hiện tại — hai luồng chính

### 1. Ingestion (ghi index)

```
POST /documents/upload  →  app/api/v1/documents.py
      │  ghi file, register document, enqueue job (→ Spring)
      ▼
DurableIngestQueue  (ingest_service.py)         job state lưu ở Spring `rag_ingest_jobs`
      ▼
DocumentIngestWorker.run()                      (ingest_worker.py) — poll reserve_next_job
      ▼
_process_job()
  ├─ chunk_from_record / build_document_chunks  (ingestion.py)
  │     loaders.load_document_pages → normalize_page_text
  │     → chunk_text (splitters.py) → make_chunk_id + fingerprint_text (hashing.py)
  ├─ backend.replace_chunks()                   chunk lưu ở Spring
  ├─ _rebuild_indexes()
  │     list_chunks → chunk_from_record
  │     → embedding_model.embed_documents
  │     → bm25_index.index_documents + vector_store.clear/upsert
  └─ mark_succeeded + document.status = "ready"
```

Worker chạy như task asyncio trong lifespan (`app/main.py`). Khi `ingest.worker_enabled=false`
(shadow host) worker chỉ `rebuild_indexes()` từ chunk đã có ở backend.

### 2. Query / chat (đọc index)

```
POST /chat/completions  →  app/api/v1/chat.py
      ▼
RAGWorkflow.run()                              (graph/workflow.py)
  loop tối đa max_rewrite_retries+1:
    rewrite_query()          graph/nodes.py  → LLM
    retrieve_documents()     ← retriever.search() (HybridRetriever)
    rerank_documents()       ← search đã rerank trong HybridRetriever (rerank_fn=None ⇒ giữ nguyên)
    grade_documents()        → LLM chấm từng snippet ("yes"/"no"), tối đa 5 batch
    route_after_grading()    graph/edges.py
        ├─ "generate" → generate_answer() + build_citations()
        ├─ "rewrite"  → retry (state.retries += 1)
        └─ "fallback" → fallback_answer()
```

`HybridRetriever` (`retrievers/service.py`) tự chạy: embed query → vector store search
(dense) + BM25 search (sparse) → `fuse_results` (RRF/weighted) → `rerank_results` → cắt
`top_k`.

## Các file ở cấp gốc

| File                | Vai trò                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__init__.py`       | Re-export API công khai của domain.                                                                                                                                                                                                                                                                                                         |
| `types.py`          | Dataclass domain: `DocumentRecord`, `DocumentChunk`, `VectorRecord`, `SearchResult`, `IngestJob`, `Citation`, `RAGState`. Dùng `slots`, timezone UTC.                                                                                                                                                                                       |
| `hashing.py`        | `fingerprint_text` (SHA-256 text), `file_fingerprint` (SHA-256 file theo block 64KB), `make_chunk_id(document_id, chunk_index, content)` → 32 hex ổn định, provider-agnostic.                                                                                                                                                               |
| `loaders.py`        | `SUPPORTED_EXTENSIONS`, `load_document_pages` (PDF theo trang qua pypdf; text/md/rst/log/csv đọc UTF-8; JSON parse rồi dump lại; PDF mã hóa → lỗi), `load_document_text`, `load_document_metadata`, `normalize_page_text`.                                                                                                                  |
| `splitters.py`      | `chunk_text()` — cửa sổ trượt `chunk_size`, cắt tại separator (`\n\n`, `\n`, `. `, space) gần cuối cửa sổ, overlap `chunk_overlap`, bỏ whitespace; validate tham số.                                                                                                                                                                        |
| `ingestion.py`      | `build_document_chunks()` — gộp loader + normalizer + splitter, sinh `DocumentChunk` có `chunk_id`, `checksum`, `page_number`, metadata (`filename`, `workspace_id`); lỗi nếu không có text.                                                                                                                                                |
| `ingest_service.py` | `DurableIngestQueue` — state machine mỏng bọc bảng job ở Spring: `enqueue_document`, `get_job`, `reserve_next_job`, `mark_succeeded`, `mark_failed` (retry khi còn attempt), `delete_job`, `recover_orphaned_jobs`.                                                                                                                         |
| `ingest_worker.py`  | `DocumentIngestWorker` — `prepare()` (recover job mồ côi, đồng bộ document `processing`), `run(stop_event)` (poll loop), `_process_job`, `_rebuild_indexes`, `rebuild_indexes`, `delete_document_artifacts` (xóa file + rebuild). Helper `chunk_payload` / `chunk_from_record` chuyển đổi giữa `DocumentChunk` và payload JSON của backend. |

## Subpackage

| Folder        | Tài liệu                                     | Tóm tắt                                             |
| ------------- | -------------------------------------------- | --------------------------------------------------- |
| `factories/`  | [factories/README.md](factories/README.md)   | Factory cho embedding, LLM, reranker.               |
| `graph/`      | [graph/README.md](graph/README.md)           | RAG state machine + node functions.                 |
| `retrievers/` | [retrievers/README.md](retrievers/README.md) | BM25, hybrid fusion, rerank, `HybridRetriever`.     |
| `stores/`     | [stores/README.md](stores/README.md)         | Vector store port + adapter in-memory/Qdrant/FAISS. |

## Điểm cần lưu ý

- Index chuyên sâu nằm **trong RAM** của process (BM25 persist ra `data/bm25_index.jsonl`, vector
  store adapter hiện là dict in-memory) và được **rebuild toàn bộ** từ chunk của backend mỗi lần
  ingest/delete — phù hợp corpus vừa, chưa tối ưu corpus lớn.
- `app/api/v1/study.py` dùng lại `chunk_from_record` từ `ingest_worker` để dựng `DocumentChunk`
  từ context backend.
