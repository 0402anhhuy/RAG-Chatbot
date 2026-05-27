from langchain_experimental.text_splitter import SemanticChunker
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from utils.config import EMBEDDING_MODEL

def semantic_chunk_documents(documents: list[Document]) -> list[Document]:
    # Tạo Embedding
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL
    )

    # Tạo bộ tách theo Semantic
    splitter = SemanticChunker(
        embeddings,
        breakpoint_threshold_type="percentile",
        breakpoint_threshold_amount=98
    )

    raw_chunks = splitter.split_documents(documents)

    # Găn metadata sau khi chunk
    final_chunks = []
    for idx, chunk in enumerate(raw_chunks):
        meta = chunk.metadata or {}

        chunk.metadata = {
            **meta,
            "chunk_id": idx,
            "mode": "semantic",
            "page": meta.get("page", "N/A"),
            "source": meta.get("source", "unknown")
        }

        final_chunks.append(chunk)

    return final_chunks
