import json
from langchain_groq import ChatGroq
from rag_core.loaders.pdf_loader import load_pdfs_from_dir
from rag_core.domain.chunking import chunk_documents
from rag_core.retrieval.retriever import build_vectorstore, get_retriever
from rag_core.retrieval.hybrid_retriever import build_hybrid_search
from rag_core.prompts.prompt_chat import get_chat_prompt
from rag_core.evaluation.chunk_benmark import (
    evaluate_hallucination,
    compare_hallucination_baseline_vs_optimized,
    plot_hallucination_comparison
)
from rag_core.config import CHAT_MODEL_GROQ, GROQ_API_KEY

# ============== SETUP ==============

# 1. Load tài liệu
print("📂 Đang load PDF...")
path = "D:\\AnhHuy\\Code\\Project\\RAG_Chatbot\\pdfs"
documents = load_pdfs_from_dir(path)

# 2. Tạo chunks
print("✂️  Đang tạo chunks...")
chunks = chunk_documents(documents=documents, mode="chat", strategy="recursize")

# 3. Tạo Vector Store
print("🔍 Đang build vector store...")
vectorstore = build_vectorstore(chunks)

# ============== BASELINE: Simple Vector Retriever ==============
print("\n📊 Cấu hình BASELINE (retriever đơn giản)...")
retriever_baseline = get_retriever(vectorstore, k=5)  # Lấy 5 docs

# ============== OPTIMIZED: Hybrid Search ==============
print("📊 Cấu hình OPTIMIZED (hybrid retrieval + context compression)...")
retriever_optimized = build_hybrid_search(vectorstore, chunks, alpha=0.5, k=5)

# ============== LOAD TEST DATA ==============
print("\n📋 Đang load eval questions...")
with open("eval_questions.json", "r", encoding="utf-8") as f:
    eval_data = json.load(f)

# ============== LLM SETUP ==============
print("🤖 Đang khởi tạo LLM...")
llm = ChatGroq(
    model=CHAT_MODEL_GROQ,
    api_key=GROQ_API_KEY,
    temperature=0.1  # Hạ thấp để giảm hallucination
)

prompt = get_chat_prompt()

# ============== RUN COMPARISON ==============
print("\n" + "="*60)
print("🚀 BẮT ĐẦU ĐÁNH GIÁ HALLUCINATION")
print("="*60)

results = compare_hallucination_baseline_vs_optimized(
    llm=llm,
    prompt_template=prompt,
    retriever_baseline=retriever_baseline,
    retriever_optimized=retriever_optimized,
    eval_data=eval_data
)

# ============== VISUALIZATION ==============
print("\n📈 Đang vẽ biểu đồ...")
plot_hallucination_comparison(
    baseline_rate=results["baseline_rate"],
    optimized_rate=results["optimized_rate"],
    reduction_pct=results["reduction_percentage"]
)

# ============== DETAILED RESULTS ==============
print("\n" + "="*60)
print("📊 CHI TIẾT KẾT QUẢ")
print("="*60)

print("\n🔴 BASELINE - Chi tiết từng câu hỏi:")
for i, detail in enumerate(results["baseline_details"], 1):
    print(f"\n   {i}. Q: {detail['question'][:50]}...")
    print(f"      Hallucination Score: {detail['hallucination_score']:.2%}")

print("\n\n🟢 OPTIMIZED - Chi tiết từng câu hỏi:")
for i, detail in enumerate(results["optimized_details"], 1):
    print(f"\n   {i}. Q: {detail['question'][:50]}...")
    print(f"      Hallucination Score: {detail['hallucination_score']:.2%}")

# ============== EXPORT RESULTS ==============
print("\n\n💾 Lưu kết quả...")
output = {
    "baseline_hallucination_rate": results["baseline_rate"],
    "optimized_hallucination_rate": results["optimized_rate"],
    "reduction_percentage": results["reduction_percentage"],
    "summary": f"Giảm hallucination rate từ {results['baseline_rate']:.1%} xuống {results['optimized_rate']:.1%} (~{results['reduction_percentage']:.0f}%)"
}

output["baseline_valid_questions"] = len(results["baseline_details"])
output["optimized_valid_questions"] = len(results["optimized_details"])

with open("hallucination_evaluation_results.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"✅ Kết quả đã lưu vào: hallucination_evaluation_results.json")
print(f"\n🎯 KẾT LUẬN: {output['summary']}")
print(f"\n📌 Câu hợp lệ được chấm: baseline={output['baseline_valid_questions']}, optimized={output['optimized_valid_questions']}")
