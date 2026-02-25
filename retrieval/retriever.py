from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

from utils.config import TOP_K


"""
---------------- Main API ----------------
- Hàm build_vectorstore() được gọi để xây dựng FAISS vector store từ các chunk đã chia nhỏ
    Args:
        chunks: list các Document đã được chia nhỏ (List[Document])
"""
def build_vectorstore(chunks: list[Document]) -> FAISS:
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
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
def get_retriever(vectorstore: FAISS, k=TOP_K) -> FAISS.Retriever:
    return vectorstore.as_retriever(
        search_kwargs={"k": k}
    )