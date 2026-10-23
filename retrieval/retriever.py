from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

from utils.config import TOP_K, EMBEDDING_MODEL


"""
---------------- Main API ----------------
- Hàm build_vectorstore() được gọi để xây dựng FAISS vector store từ các chunk đã chia nhỏ
    Args:
        chunks: list các Document đã được chia nhỏ (List[Document])
"""
def build_vectorstore(chunks: list[Document]) -> FAISS:
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL
    )

    vectorstore = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings
    )

    return vectorstore


"""
---------------- Main API ----------------
- Hàm get_retriever() được gọi để tạo retriever từ vector store đã xây dựng
        Args:
            vectorstore: FAISS vector store đã xây dựng
            k: số lượng chunk gần nhất cần truy xuất (mặc định: TOP_K)
"""
def get_retriever(vectorstore: FAISS, k=TOP_K) -> FAISS.as_retriever:
    return vectorstore.as_retriever(
        search_kwargs={"k": k}
    )