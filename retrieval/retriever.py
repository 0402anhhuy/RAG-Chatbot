from typing import List, Tuple

from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

from utils.config import TOP_K



# Tạo Vector store từ các chunk tài liệu
def build_vectorstore(chunks: List[Document]) -> FAISS:
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )

    vectorstore = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings
    )

    return vectorstore


# =========================
# 2️⃣ MMR Retriever
# =========================

def get_retriever(
    vectorstore: FAISS,
    k: int = TOP_K,
    fetch_k: int = 20,
    lambda_mult: float = 0.7
):
    """
    Return MMR-based retriever for diversity-aware retrieval.
    """

    return vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": k,
            "fetch_k": fetch_k,
            "lambda_mult": lambda_mult
        }
    )


# =========================
# 3️⃣ Retrieval With Threshold (Anti-Hallucination Layer)
# =========================

def retrieve_with_threshold(vectorstore: FAISS, query: str, k: int = TOP_K, score_threshold: float = 0.15) -> List[Document]:
    """
    Perform similarity search and filter by similarity threshold.

    FAISS returns distance score.
    With normalized embeddings:
        similarity ≈ 1 - distance
    """

    results: List[Tuple[Document, float]] = (
        vectorstore.similarity_search_with_score(query, k=k)
    )

    filtered_docs = []

    for doc, distance in results:
        similarity = 1 - distance

        if similarity >= score_threshold:
            doc.metadata["similarity"] = round(similarity, 4)
            filtered_docs.append(doc)

    return filtered_docs


# =========================
# 4️⃣ Context Builder (Structured + Citation-Friendly)
# =========================

def build_context(docs: List[Document]) -> str:
    context_blocks = []

    for doc in docs:
        page = doc.metadata.get("page", "N/A")
        source = doc.metadata.get("source", "unknown")
        similarity = doc.metadata.get("similarity", "N/A")

        formatted_block = (
            f"[Source: {source} | Page: {page} | Similarity: {similarity}]\n"
            f"{doc.page_content}"
        )

        context_blocks.append(formatted_block)

    return "\n\n---\n\n".join(context_blocks)
