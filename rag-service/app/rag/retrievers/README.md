# `app/rag/retrievers` — Hybrid retrieval (sparse + dense)

## Chức năng

Truy xuất chunk theo hai hướng — **BM25 (sparse)** và **vector (dense)** — rồi hợp nhất
kết quả, rerank và cắt top-k. Đồng thời cung cấp `HybridRetriever` là object được dùng trực
tiếp bởi `/retrieval/search` và `/chat/*`.

## Pipeline hiện tại

```
HybridRetriever.search(query, workspace_id, document_ids?)
  │  filter = {"workspace_id": ws} (+ {"document_id": [ids]} nếu có)
  ├─ dense:  embedding_model.embed_query(query) → vector_store.search(top_k_dense, filters)
  ├─ sparse: bm25_index.search(query, top_k_sparse, filters)
  ├─ fuse_results(dense, sparse, strategy=rrf|weighted, rrf_k, weights)
  └─ rerank_results(fused, provider=none|simple, query) → [:reranker.top_k]
```

Một điểm quan trọng: **lọc `workspace_id` / `document_id` diễn ra ở cả hai nhánh** — vector
store lọc theo metadata, BM25 lọc theo `metadata` của chunk. Đây là ranh giới cô lập dữ liệu
giữa workspace.

## Các file

| File          | Vai trò                                                                                                                                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bm25.py`     | `BM25Index`: tokenize `\b\w+\b` lowercase; index in-RAM dạng dict theo `chunk_id`; `index_documents` (nhận `DocumentChunk` hoặc dict), `load`/`save` snapshot JSONL (ghi file tmp rồi replace — atomic), `search` với BM25 (k1=1.5, b=0.75) và filter metadata, `_recompute_idf`, `rebuild`. |
| `hybrid.py`   | `fuse_results()`: `weighted` — min-max normalize score rồi trộn `dense_weight`/`sparse_weight` (mặc định 0.7/0.3); `rrf` — Reciprocal Rank Fusion `1/(k+rank)`, k mặc định 60. Ghi thêm `dense_rank`/`sparse_rank` hoặc `dense_score`/`sparse_score` vào metadata.                           |
| `reranker.py` | `NoOpReranker` và `rerank_results()`: provider `none` giữ nguyên thứ tự; provider khác cộng điểm overlap token (`+0.05/token`) và sort lại.                                                                                                                                                  |
| `service.py`  | `HybridRetriever`: validate `workspace_id`, trả `[]` khi `document_ids` rỗng, chạy dense + sparse song song (tuần tự trong code) với filter, fusion, rerank, cắt `top_k`.                                                                                                                    |

## Điểm cần lưu ý

- `retrieval.rerank_top_k` trong settings **không được dùng ở đây** — `HybridRetriever` cắt
  theo `reranker.top_k` (mặc định 4). Cân nhắc đồng bộ nếu chỉnh config.
- `retrieval.score_threshold` cũng chưa được áp trong `HybridRetriever`; ngưỡng này xuất hiện
  trong `core/quality.py` cho quality gate.
- BM25 lưu token (không lưu TF) trong snapshot JSONL → file `data/bm25_index.jsonl` có thể lớn
  theo corpus; `rebuild_on_boot=true` sẽ dựng lại toàn bộ từ backend mỗi lần khởi động.
