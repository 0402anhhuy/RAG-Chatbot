# `app/rag/graph` — RAG workflow state machine

## Chức năng

Chứa logic "LangGraph-style" điều phối quá trình trả lời câu hỏi nhưng **không phụ thuộc
thư viện LangGraph** — chỉ là một runner tất định quanh các node function. Mục tiêu: mock
được end-to-end, giới hạn retry, và trả fallback thay vì bịa.

## Pipeline hiện tại

```
RAGWorkflow.run(question, retrieval_fn=..., history=..., ...)
  state = RAGState(question)
  for attempt in range(max_rewrite_retries + 1):
      rewrite_query(state, llm)          → state.rewritten_query
      retrieve_documents(state, dense_results=retrieval_fn(rewritten_query))
      rerank_documents(state, rerank_fn=None)   → reranked_results = retrieval_results
      grade_documents(state, llm, max_batch_size=5) → relevant_results
      decision = route_after_grading(state)
        "generate" → generate_answer(...)  → state.answer, state.citations, status="generated"
        "fallback" → fallback_answer(...)  → state.fallback_answer, status="fallback"
        "rewrite"  → retries += 1, status="retrying", lặp lại
  (hết retry) → fallback_answer(...)
```

Lưu ý: retrieval thật (dense+sparse+fusion+rerank) nằm trong `HybridRetriever`; workflow chỉ
gọi `retrieval_fn` như một callback (`request.app.state.retriever.search` trong `chat.py`).

## Các file

| File          | Vai trò                                                                                                                                                                                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__init__.py` | Re-export các node, edge và `RAGState`.                                                                                                                                                                                                                                                                                                   |
| `state.py`    | Chỉ re-export `RAGState` từ `app.rag.types` (giữ nơi import ổn định).                                                                                                                                                                                                                                                                     |
| `edges.py`    | `route_after_grading(state)`: có `relevant_results` → `"generate"`; còn retry → `"rewrite"`; hết retry → `"fallback"`.                                                                                                                                                                                                                    |
| `nodes.py`    | Node funcs: `rewrite_query` (dùng 3 lượt lịch sử gần nhất, làm sạch prefix "Rewritten query:"), `retrieve_documents`, `rerank_documents`, `grade_documents` (+ `_grade_response` parse JSON/yes), `_truncate_context` (head/tail/middle-out), `build_citations` (snippet 200 ký tự, source + page), `generate_answer`, `fallback_answer`. |
| `workflow.py` | `RAGWorkflow` — runner với prompt template mặc định (có thể override từ `settings.prompts`), vòng retry rewrite và các nhánh kết thúc.                                                                                                                                                                                                    |

## Điểm cần lưu ý

- `grade_documents` gọi LLM **một lần cho mỗi snippet** (tối đa `max_batch_size` = 5) → với
  provider thật đây là điểm tốn token/latency; mock provider trả ngay `{"score":"yes"}`.
- Prompt từ `config/settings.yaml` (`query_rewrite`, `grade_documents`, `system_qa`, `fallback`)
  được truyền vào khi khởi tạo `RAGWorkflow` ở `chat.py`, ghi đè default trong `workflow.py`.
- `state.all` không sửa trực tiếp dataclass ngoài các node — runner giữ tính tất định.
