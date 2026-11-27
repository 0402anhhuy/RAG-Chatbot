"""Run retrieval/QA evaluation against a JSONL dataset."""

from __future__ import annotations

import statistics
import tempfile
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from pydantic import SecretStr

from app.eval.dataset import EvalCase
from app.eval.embedding import HashingEmbeddingModel
from app.eval.metrics import groundedness, ndcg_at_k, precision_at_k, recall_at_k, reciprocal_rank
from app.rag.factories.llm_factory import ChatModel, MockLLM
from app.rag.graph.workflow import RAGWorkflow
from app.rag.ingestion import build_document_chunks
from app.rag.retrievers.bm25 import BM25Index
from app.rag.retrievers.service import HybridRetriever
from app.rag.stores.in_memory import InMemoryVectorStore
from app.rag.types import DocumentChunk, SearchResult, VectorRecord
from config.settings import Settings

_EVAL_LLM: ChatModel = MockLLM()


def build_eval_settings(
    *,
    chunk_size_tokens: int = 512,
    chunk_overlap_tokens: int = 64,
    index_version: str = "chunk-v3",
    fusion_strategy: str = "weighted",
    score_threshold: float = 0.0,
    reranker: str = "none",
    strip_diacritics: bool = False,
    grade_batch: bool = False,
    live: bool = False,
) -> Settings:
    base = Settings()
    retrieval = base.retrieval.model_copy(
        update={
            "chunk_unit": "tokens",
            "chunk_size_tokens": chunk_size_tokens,
            "chunk_overlap_tokens": chunk_overlap_tokens,
            "index_version": index_version,
            "fusion_strategy": fusion_strategy,
            "score_threshold": score_threshold,
            "rerank_top_k": 5,
        }
    )
    bm25 = base.bm25.model_copy(update={"strip_diacritics": strip_diacritics, "rebuild_on_boot": True})
    reranker_settings = base.reranker.model_copy(
        update={"provider": reranker, "fallback_provider": "simple"}
    )
    graph = base.graph.model_copy(update={"grade_batch": grade_batch})
    provider_config = base.provider_config.model_copy(update={"enabled": False})
    llm = base.llm if live else base.llm.model_copy(
        update={"provider": "mock", "model": "mock-model", "api_key": SecretStr("")}
    )
    return base.model_copy(
        update={
            "retrieval": retrieval,
            "bm25": bm25,
            "reranker": reranker_settings,
            "graph": graph,
            "provider_config": provider_config,
            "llm": llm,
        }
    )


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


def _chunks_for_case(case: EvalCase, settings: Settings) -> tuple[list[DocumentChunk], str, set[str]]:
    workspace_id = case.workspace_id or f"eval-{case.id}"
    with tempfile.TemporaryDirectory() as directory:
        source = Path(directory) / f"{case.id}.txt"
        source.write_text(case.document, encoding="utf-8")
        chunks = build_document_chunks(
            source,
            document_id=f"doc-{case.id}",
            filename=f"{case.id}.txt",
            chunk_size=settings.retrieval.chunk_size,
            chunk_overlap=settings.retrieval.chunk_overlap,
            workspace_id=workspace_id,
            chunk_unit="tokens",
            chunk_size_tokens=settings.retrieval.chunk_size_tokens,
            chunk_overlap_tokens=settings.retrieval.chunk_overlap_tokens,
            min_chunk_tokens=settings.retrieval.min_chunk_tokens,
            index_version=settings.retrieval.index_version,
        )
    spans = [_normalize(span) for span in case.relevant_spans]
    relevant_ids = {
        chunk.chunk_id
        for chunk in chunks
        if any(span in _normalize(chunk.content) for span in spans)
    }
    if not relevant_ids:
        raise ValueError(f"case {case.id}: no chunk contains a relevant span")
    return chunks, workspace_id, relevant_ids


def _index_case(
    case: EvalCase,
    chunks: Sequence[DocumentChunk],
    settings: Settings,
    directory: str,
) -> HybridRetriever:
    bm25 = BM25Index(
        Path(directory) / f"{case.id}.jsonl",
        strip_diacritics=settings.bm25.strip_diacritics,
        expand_compounds=settings.bm25.expand_compounds,
        index_version=settings.retrieval.index_version,
    )
    bm25.index_documents(list(chunks))
    embedding = HashingEmbeddingModel()
    store = InMemoryVectorStore()
    store.upsert_many(
        [
            VectorRecord(
                id=chunk.chunk_id,
                values=embedding.embed_query(chunk.content),
                metadata={
                    **chunk.metadata,
                    "document_id": chunk.document_id,
                    "chunk_id": chunk.chunk_id,
                    "content": chunk.content,
                    "page_number": chunk.page_number,
                },
            )
            for chunk in chunks
        ]
    )
    return HybridRetriever(
        bm25_index=bm25,
        vector_store=store,
        embedding_model=embedding,
        retrieval_settings=settings.retrieval,
        reranker_settings=settings.reranker,
    )


def evaluate_case(
    case: EvalCase,
    settings: Settings,
    *,
    top_k: int = 5,
    run_workflow: bool = True,
    llm: ChatModel | None = None,
) -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as directory:
        chunks, workspace_id, relevant_ids = _chunks_for_case(case, settings)
        retriever = _index_case(case, chunks, settings, directory)
        started = time.perf_counter()
        results: list[SearchResult] = retriever.search(case.question, workspace_id=workspace_id)
        latency_ms = (time.perf_counter() - started) * 1000
        retrieved_ids = [result.chunk_id for result in results]

        row: dict[str, Any] = {
            "id": case.id,
            "question": case.question,
            "workspace_id": workspace_id,
            "relevant_chunk_ids": sorted(relevant_ids),
            "retrieved_chunk_ids": retrieved_ids,
            "recall": recall_at_k(retrieved_ids, relevant_ids, top_k),
            "precision": precision_at_k(retrieved_ids, relevant_ids, top_k),
            "mrr": reciprocal_rank(retrieved_ids, relevant_ids),
            "ndcg": ndcg_at_k(retrieved_ids, relevant_ids, top_k),
            "latency_ms": latency_ms,
            "tags": list(case.tags),
        }

        if run_workflow:
            workflow = RAGWorkflow(
                llm=llm or _EVAL_LLM,
                max_rewrite_retries=settings.graph.max_rewrite_retries,
                skip_rewrite_max_words=settings.graph.skip_rewrite_max_words,
                rewrite_cache_ttl_seconds=0,
                grade_batch=settings.graph.grade_batch,
                grade_batch_size=settings.graph.grade_batch_size,
            )
            state = workflow.run(
                case.question,
                retrieval_fn=lambda query: retriever.search(query, workspace_id=workspace_id),
                max_context_chars=settings.graph.context_max_chars,
                truncation_strategy=settings.graph.truncation_strategy,
            )
            cited = [citation.chunk_id for citation in state.citations]
            row.update(
                {
                    "status": state.status,
                    "fallback": state.status == "fallback",
                    "answer_chars": len(state.answer),
                    "cited_chunk_ids": cited,
                    "groundedness": groundedness(cited, relevant_ids),
                }
            )
        return row


def evaluate_dataset(
    cases: Sequence[EvalCase],
    settings: Settings,
    *,
    top_k: int = 5,
    run_workflow: bool = True,
    llm: ChatModel | None = None,
) -> dict[str, Any]:
    if not cases:
        raise ValueError("no evaluation cases")
    rows = [
        evaluate_case(case, settings, top_k=top_k, run_workflow=run_workflow, llm=llm)
        for case in cases
    ]
    aggregate = {
        "cases": len(rows),
        "recall": statistics.fmean(row["recall"] for row in rows),
        "precision": statistics.fmean(row["precision"] for row in rows),
        "mrr": statistics.fmean(row["mrr"] for row in rows),
        "ndcg": statistics.fmean(row["ndcg"] for row in rows),
        "latency_ms_p50": statistics.median(row["latency_ms"] for row in rows),
        "latency_ms_mean": statistics.fmean(row["latency_ms"] for row in rows),
    }
    if run_workflow:
        aggregate.update(
            {
                "fallback_rate": statistics.fmean(1.0 if row["fallback"] else 0.0 for row in rows),
                "groundedness": statistics.fmean(row["groundedness"] for row in rows),
            }
        )
    return {
        "config": {
            "top_k": top_k,
            "chunk_size_tokens": settings.retrieval.chunk_size_tokens,
            "chunk_overlap_tokens": settings.retrieval.chunk_overlap_tokens,
            "fusion_strategy": settings.retrieval.fusion_strategy,
            "score_threshold": settings.retrieval.score_threshold,
            "reranker": settings.reranker.provider,
            "strip_diacritics": settings.bm25.strip_diacritics,
            "index_version": settings.retrieval.index_version,
            "workflow": run_workflow,
        },
        "aggregate": aggregate,
        "cases": rows,
    }


def render_markdown(report: dict[str, Any]) -> str:
    config = report["config"]
    aggregate = report["aggregate"]
    lines = [
        "# Retrieval evaluation",
        "",
        f"- Cases: {aggregate['cases']}",
        f"- Top-k: {config['top_k']}",
        f"- Chunk: {config['chunk_size_tokens']} tokens / overlap {config['chunk_overlap_tokens']}",
        f"- Fusion: {config['fusion_strategy']} · threshold {config['score_threshold']}",
        f"- Reranker: {config['reranker']}",
        f"- Recall@{config['top_k']}: {aggregate['recall']:.4f}",
        f"- Precision@{config['top_k']}: {aggregate['precision']:.4f}",
        f"- MRR: {aggregate['mrr']:.4f}",
        f"- nDCG@{config['top_k']}: {aggregate['ndcg']:.4f}",
        f"- Latency p50: {aggregate['latency_ms_p50']:.1f} ms",
    ]
    if "fallback_rate" in aggregate:
        lines.extend(
            [
                f"- Fallback rate: {aggregate['fallback_rate']:.4f}",
                f"- Groundedness: {aggregate['groundedness']:.4f}",
            ]
        )
    lines.extend(
        [
            "",
            "| id | recall | nDCG | MRR | latency (ms) |",
            "| --- | ---: | ---: | ---: | ---: |",
        ]
    )
    for row in report["cases"]:
        lines.append(
            f"| {row['id']} | {row['recall']:.3f} | {row['ndcg']:.3f} | "
            f"{row['mrr']:.3f} | {row['latency_ms']:.1f} |"
        )
    lines.append("")
    return "\n".join(lines)


__all__ = [
    "build_eval_settings",
    "evaluate_case",
    "evaluate_dataset",
    "render_markdown",
]
