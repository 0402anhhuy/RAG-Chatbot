from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain_core.documents import Document
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from typing import List


class TopKEnsembleRetriever(EnsembleRetriever):
    k: int = 5

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        # Dùng EnsembleRetriever để lấy docs, sau đó cắt đúng k docs trả về
        docs = super()._get_relevant_documents(query, run_manager=run_manager)
        return docs[:self.k]


def build_hybrid_search(vectorstore, documents, alpha: float = 0.5, k: int = 5) -> TopKEnsembleRetriever:
    bm25_retriever = BM25Retriever.from_documents(documents)
    bm25_retriever.k = k * 3

    vector_retriever = vectorstore.as_retriever(
        search_kwargs={"k": k * 3}
    )

    return TopKEnsembleRetriever(
        retrievers=[bm25_retriever, vector_retriever],
        weights=[alpha, 1 - alpha],
        k=k
    )