from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

from utils.config import TOP_K


def build_vectorstore(chunks):
    """
    Build FAISS vector store from document chunks
    Embedding is done locally (no API, no quota)
    """

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vectorstore = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings
    )

    return vectorstore


def get_retriever(vectorstore, k=TOP_K):
    """
    Return retriever object for top-k similarity search
    """
    return vectorstore.as_retriever(
        search_kwargs={"k": k}
    )
