# `app/rag/stores` — Vector store adapters

## Chức năng

Định nghĩa **port** cho vector store và cung cấp nhiều adapter cùng hành vi: in-memory,
Qdrant-compatible, FAISS-compatible. Nhờ đó domain chỉ làm việc với interface `VectorStorePort`,
còn backend cụ thể được chọn qua config `vector_store.backend`.

## Pipeline hiện tại

```
app/main.py
  create_vector_store(settings.vector_store.backend, collection, url, persist_path, vector_size)
      │
      ▼
  InMemoryVectorStore | QdrantVectorStore | FAISSVectorStore

Worker (rebuild index):
  vector_store.clear()
  vector_store.upsert(VectorRecord(id=chunk_id, values=embed, metadata={...}))
Query:
  vector_store.search(query_vec, top_k=top_k_dense, filters={workspace_id, document_id})
```

## Các file

| File               | Vai trò                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------- |
| `__init__.py`      | Re-export `VectorStorePort`, `normalize_score`, `create_vector_store` và các adapter.                                                                                                      |
| `base.py`          | `VectorStorePort` (ABC): `add`, `upsert`, `delete`, `search`, `clear`, `close`. Helper `normalize_score()` (cosine −1..1 → 0..1) và `metadata_matches()` (filter scalar hoặc tập giá trị). |
| `in_memory.py`     | `InMemoryVectorStore` — dict `id → VectorRecord`, cosine similarity, filter metadata, sort giảm dần, cắt top-k. Dùng cho test và local dev.                                                |
| `faiss_store.py`   | `FAISSVectorStore` — hiện là **implementation in-memory tương thích hành vi FAISS** (dùng dict + cosine), không import `faiss`. Có `index_path`/`vector_size` dự phòng cho bản FAISS thật. |
| `qdrant_store.py`  | `QdrantVectorStore` — **in-memory tương thích hành vi Qdrant** (giữ `url`, `api_key`, `collection_name`) nhưng chưa gọi Qdrant qua HTTP.                                                   |
| `store_factory.py` | `create_vector_store(backend=...)`: `in_memory`                                                                                                                                            | `qdrant` | `faiss`; backend khác → `ValueError`. |

## Điểm cần lưu ý

- Cả `QdrantVectorStore` và `FAISSVectorStore` hiện **chưa là adapter thật** — dữ liệu không
  được persist qua process restart; trạng thái được khôi phục bằng cách rebuild từ chunk của
  Spring backend (`DocumentIngestWorker._rebuild_indexes`). Xem ADR
  [adr-0002](../../docs/architecture/decisions/adr-0002-vector-store-and-embedding-backends.md).
- Point vector sử dụng **cosine**; `normalize_score` đảm bảo score nằm trong [0, 1] để so với
  threshold.
- `close()` của các adapter đều `clear()` — không giải phóng tài nguyên ngoài, an toàn khi shutdown
  (`app/main.py` gọi `await asyncio.to_thread(vector_store.close)`).
