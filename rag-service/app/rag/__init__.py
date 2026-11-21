"""Domain layer for the RAG service."""

from app.rag.factories.embedding_factory import EmbeddingFactory
from app.rag.factories.llm_factory import LLMFactory, MockLLM
from app.rag.graph.workflow import RAGWorkflow
from app.rag.hashing import make_chunk_id
from app.rag.ingest_service import DurableIngestQueue
from app.rag.loaders import load_document_metadata, load_document_text
from app.rag.retrievers.bm25 import BM25Index
from app.rag.retrievers.hybrid import fuse_results
from app.rag.retrievers.reranker import rerank_results
from app.rag.splitters import chunk_text
from app.rag.types import Citation, DocumentChunk, DocumentRecord, IngestJob, RAGState, SearchResult, VectorRecord

__all__ = [
    "BM25Index",
    "Citation",
    "DocumentChunk",
    "DocumentRecord",
    "DurableIngestQueue",
    "EmbeddingFactory",
    "IngestJob",
    "LLMFactory",
    "MockLLM",
    "RAGState",
    "RAGWorkflow",
    "SearchResult",
    "VectorRecord",
    "chunk_text",
    "fuse_results",
    "load_document_metadata",
    "load_document_text",
    "make_chunk_id",
    "rerank_results",
]
