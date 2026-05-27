from langchain_core.documents import Document

from domain.semantic_chunking import semantic_chunk_documents
from domain.recursive_chunking import recursive_chunk_documents

"""
---------------- Main API ----------------
- Hàm chunk_documents() được gọi để chia nhỏ document thành các chunk → List[Document]
    Args:
        documents: list các Document sau khi load (List[Document])
        mode: "rag" | "flashcard" | "exam"
"""
def chunk_documents(documents: list[Document], mode="chat", strategy="recursize") -> list[Document]:
    if strategy == "semantic":
        return semantic_chunk_documents(documents=documents)
    else:
        return recursive_chunk_documents(documents=documents, mode=mode)
    