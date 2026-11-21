# `app/rag/factories` — Provider factories

## Chức năng

Tách domain khỏi nhà cung cấp cụ thể: chọn implementation cho **embedding**, **LLM** và
**reranker** dựa trên config. Mọi class đều giữ cùng một interface (Protocol/ABC nhỏ) để
phần còn lại của hệ thống không phụ thuộc provider.

## Pipeline hiện tại

```
config/settings.yaml (embedding/llm/reranker provider)
        │
        ▼
EmbeddingFactory.create()  ──►  DummyEmbeddingModel | SentenceTransformersEmbeddingModel | OpenAIEmbeddingModel
LLMFactory.create()        ──►  MockLLM | OpenAICompatibleChatModel | GeminiChatModel
RerankerFactory.create()   ──►  NoOpReranker | SimpleReranker

Được gọi ở:
- app/main.py (EmbeddingFactory → embed khi rebuild index/query)
- app/api/v1/chat.py (LLMFactory cho RAGWorkflow)
- app/api/v1/study.py (LLMFactory cho flashcard/exam)
```

## Các file

| File                   | Vai trò                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__init__.py`          | Re-export `EmbeddingFactory`, `LLMFactory`, `RerankerFactory`, `MockLLM`, `DummyEmbeddingModel`, `OpenAIEmbeddingModel`.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `embedding_factory.py` | Protocol `EmbeddingModel` (`embed_query`, `embed_documents`). `DummyEmbeddingModel`: embedding hash tất định (dùng cho test/local, dimension mặc định 384). `OpenAIEmbeddingModel`: gọi `/embeddings` qua `urllib` (hỗ trợ `dimensions` cho `text-embedding-3*`). `SentenceTransformersEmbeddingModel`: lazy import `sentence_transformers`, encode chuẩn hóa. `EmbeddingFactory.create(provider=...)` chọn theo tên (`dummy/mock/test`, `huggingface/sentence-transformers`, `openai`).                                                            |
| `llm_factory.py`       | Protocol `ChatModel` (`complete`, `stream`). `MockLLM`: trả kết quả tất định theo nội dung prompt (nhận diện rewrite/grade/flashcard/exam/fallback/QA) — chính là "brain" cho test end-to-end. `OpenAICompatibleChatModel`: dùng chung cho `openai`, `ollama`, `vllm` qua `/chat/completions`, có retry backoff cho 429/5xx và lỗi mạng. `GeminiChatModel`: gọi `generativelanguage.googleapis.com/.../models/{model}:generateContent` với header `x-goog-api-key`. `LLMFactory.create()` map provider → model mặc định và yêu cầu API key khi cần. |
| `reranker_factory.py`  | `SimpleReranker` (gọi `rerank_results(provider="simple")`) và `RerankerFactory.create()` trả `NoOpReranker` khi `none/disabled/off`, ngược lại `simple`.                                                                                                                                                                                                                                                                                                                                                                                            |

## Điểm cần lưu ý

- Hiện `HybridRetriever` **không dùng** `RerankerFactory`; nó gọi trực tiếp `rerank_results(provider=settings.reranker.provider)`.
  `RerankerFactory` là đường mở rộng cho reranker thật (cross-encoder, Cohere…) sau này.
- `MockLLM` bắt buộc phải giữ để test offline; ở production `Settings.validate_production_security`
  chặn cấu hình `llm.provider=mock` và `embedding.provider=dummy`.
- Provider không hợp lệ sẽ raise `ValueError` (embedding/reranker) hoặc `RuntimeError` (thiếu key).
