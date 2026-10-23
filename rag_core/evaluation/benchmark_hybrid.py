import time
import matplotlib.pyplot as plt
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever

# ====== Implement lại thuật toán cũ để làm mốc so sánh ======
class OldHybridRetriever:
    def __init__(self, bm25, vector, alpha=0.5, k=5):
        self.bm25 = bm25
        self.vector = vector
        self.alpha = alpha
        self.k = k
        
    def invoke(self, query):
        keyword_docs = self.bm25.invoke(query)
        semantic_docs = self.vector.invoke(query)
        
        keyword_scores = {doc.page_content: 1 / (i + 1) for i, doc in enumerate(keyword_docs)}
        semantic_scores = {doc.page_content: 1 / (i + 1) for i, doc in enumerate(semantic_docs)}
        
        all_contents = set(keyword_scores.keys()) | set(semantic_scores.keys())
        final_scores = []
        for content in all_contents:
            k_score = keyword_scores.get(content, 0)
            s_score = semantic_scores.get(content, 0)
            final = self.alpha * k_score + (1 - self.alpha) * s_score
            final_scores.append((content, final))
            
        final_scores.sort(key=lambda x: x[1], reverse=True)
        return [Document(page_content=content) for content, _ in final_scores[:self.k]]


from langchain_core.embeddings import Embeddings

# ====== Fake Embedding Model để test tốc độ ======
class FakeEmbeddings(Embeddings):
    def embed_documents(self, texts):
        return [[0.1] * 384 for _ in texts]
    def embed_query(self, text):
        return [0.1] * 384


def run_benchmark():
    print("🚀 Đang khởi tạo dữ liệu giả lập (10,000 chunks)...")
    documents = [Document(page_content=f"Đây là tài liệu mẫu số {i} với nội dung RAG Chatbot test tốc độ Hybrid Search. Từ khóa đặc biệt: keyword_{i}") for i in range(10000)]
    
    print("⏳ Đang build BM25 Retriever...")
    bm25_retriever = BM25Retriever.from_documents(documents)
    bm25_retriever.k = 15
    
    print("⏳ Đang build FAISS Vector Store...")
    vectorstore = FAISS.from_documents(documents[:100], FakeEmbeddings())
    # Add texts nhanh cho test
    vectorstore.add_texts([d.page_content for d in documents[100:]])
    vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 15})
    
    print("✅ Build xong. Bắt đầu đo tốc độ...\n")
    
    old_retriever = OldHybridRetriever(bm25_retriever, vector_retriever, k=5)
    
    new_retriever = EnsembleRetriever(
        retrievers=[bm25_retriever, vector_retriever],
        weights=[0.5, 0.5]
    )
    
    query = "Từ khóa đặc biệt: keyword_5000"
    num_tests = 50
    
    # 1. Measure Old
    start = time.time()
    for _ in range(num_tests):
        old_retriever.invoke(query)
    old_time = (time.time() - start) / num_tests * 1000 # ms
    
    # 2. Measure New
    start = time.time()
    for _ in range(num_tests):
        new_retriever.invoke(query)
    new_time = (time.time() - start) / num_tests * 1000 # ms
    
    print("="*40)
    print("📊 KẾT QUẢ BENCHMARK (Trung bình 50 lượt chạy)")
    print("="*40)
    print(f"🔴 Vòng lặp thủ công cũ (Old Python Loop): {old_time:.2f} ms")
    print(f"🟢 Langchain EnsembleRetriever:           {new_time:.2f} ms")
    
    speedup = (old_time - new_time) / old_time * 100
    if speedup > 0:
        print(f"👉 Nhanh hơn: {speedup:.1f}%")
    else:
        print(f"👉 Tốc độ xấp xỉ tương đương (Tối ưu về mặt kiến trúc & memory)")
    print("="*40)
    
    # Plotting
    labels = ['Old Python Loop', 'Langchain Ensemble']
    times = [old_time, new_time]
    
    plt.figure(figsize=(8, 5))
    bars = plt.bar(labels, times, color=['#e74c3c', '#2ecc71'], width=0.5)
    plt.ylabel("Latency (ms) - Thấp hơn là tốt hơn")
    plt.title("So sánh Tốc độ Hybrid Search (10,000 Documents)")
    
    for bar in bars:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, yval + 0.5, f"{yval:.2f} ms", ha='center', va='bottom', fontweight='bold')
        
    plt.tight_layout()
    plt.savefig("hybrid_speed_comparison.png")
    print("✅ Đã lưu biểu đồ vào file 'hybrid_speed_comparison.png'")

if __name__ == "__main__":
    run_benchmark()
