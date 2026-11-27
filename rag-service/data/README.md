# `data` — Runtime local state

## Chức năng

Thư mục ghi dữ liệu **runtime cục bộ của process RAG service**, không phải nguồn sự thật
(source of truth). Document metadata, chunk và ingest job được lưu ở Spring backend; thư mục
này chỉ chứa bản sao file nguồn và các snapshot index phục vụ service.

## Pipeline hiện tại

```
app/api/v1/documents.py
    ghi file upload  → data/uploads/{documentId}-{filename}
    register document ở backend (sourcePath = đường dẫn trên)

DocumentIngestWorker
    _rebuild_indexes()
      → bm25_index.save()  → data/bm25_index.jsonl   (atomic: ghi .tmp rồi replace)
      → vector_store (in-memory; persist_path=data/vector_store nếu adapter persist thật)

DELETE /documents/{id}
    → delete_document_artifacts: unlink file trong data/uploads + rebuild index
```

## Nội dung

| Đường dẫn                   | Nội dung                                                                                         | Ai ghi                       |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- |
| `uploads/`                  | File nguồn đã upload, đặt tên `{document_id}-{filename}` (xem `settings.upload.directory`)       | `app/api/v1/documents.py`    |
| `bm25_index.jsonl`          | Snapshot BM25 (mỗi dòng một chunk: `chunk_id`, `document_id`, `content`, `tokens`, `metadata`)   | `app/rag/retrievers/bm25.py` |
| `vector_store/`             | Thư mục persist cho vector store backend `faiss` (`vector_store.persist_path`)                   | `app/rag/stores/*`           |
| `app.db`, `ingest_queue.db` | SQLite **di sản** từ giai đoạn trước khi chuyển state sang Spring; hiện không còn được code dùng | (không ghi/thêm)             |

## Điểm cần lưu ý

- Có thể **xóa an toàn** `uploads/`, `bm25_index.jsonl`, `vector_store/` khi dừng service: index
  sẽ được rebuild từ chunk của backend khi khởi động (`bm25.rebuild_on_boot=true`,
  `worker.prepare/rebuild_indexes`).
- Không commit dữ liệu runtime vào git (đã nằm trong `.gitignore` của service); đây là dữ liệu test.
- Trong container, các đường dẫn này trỏ về `/app/data/...` (xem `Dockerfile`), nên cần volume
  nếu muốn giữ file nguồn qua lần deploy.
