import matplotlib.pyplot as plt
import numpy as np
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained(
    "sentence-transformers/all-MiniLM-L6-v2"
)

def count_tokens(text: str) -> int:
    return len(tokenizer.encode(text))

def benchmark_chunking(recursive_chunks, semantic_chunks):
    def stats(chunks):
        if not chunks:
            return {"num_chunks": 0, "avg_tokens": 0, "max_tokens": 0}
            
        token_counts = [count_tokens(c.page_content) for c in chunks]
        return {
            "num_chunks": len(chunks),
            "avg_tokens": round(sum(token_counts) / len(token_counts), 2),
            "max_tokens": max(token_counts)
        }

    rec = stats(recursive_chunks)
    sem = stats(semantic_chunks)

    print("Recursive:", rec)
    print("Semantic:", sem)

    labels = ["Num Chunks", "Avg Tokens", "Max Tokens"]
    rec_values = [rec["num_chunks"], rec["avg_tokens"], rec["max_tokens"]]
    sem_values = [sem["num_chunks"], sem["avg_tokens"], sem["max_tokens"]]

    # Cấu hình vị trí các cột
    x = np.arange(len(labels))
    width = 0.35  # Độ rộng của mỗi cột

    fig, ax = plt.subplots(figsize=(10, 6))

    # Vẽ cột cạnh nhau
    rects1 = ax.bar(x - width/2, rec_values, width, label='Recursive', color='#3498db')
    rects2 = ax.bar(x + width/2, sem_values, width, label='Semantic', color='#e67e22')

    # Thêm tiêu đề và nhãn
    ax.set_title("So sánh Chiến thuật Chunking: Recursive vs Semantic", fontsize=14, pad=20)
    ax.set_ylabel("Giá trị (Tokens / Chunks)")
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.legend()

    # Hàm tự động chèn số liệu lên đầu cột
    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height}',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=10, fontweight='bold')

    autolabel(rects1)
    autolabel(rects2)

    plt.tight_layout()
    plt.show()

def calculate_metrics_for_query(docs, truth):
    """
    Calculate Hit (Recall@K), Precision@K, and MRR for a single query.
    Assumes `truth` is a substring of the target document.
    """
    # Xử lý chuẩn hoá text (bỏ qua khoảng trắng dư thừa, lower)
    truth_norm = " ".join(truth.lower().split())[:50] # Lấy 50 ký tự đầu làm signature
    
    hit = 0
    mrr = 0.0
    relevant_count = 0
    
    for rank, doc in enumerate(docs, start=1):
        content_norm = " ".join(doc.page_content.lower().split())
        if truth_norm in content_norm:
            hit = 1
            relevant_count += 1
            if mrr == 0.0:
                mrr = 1.0 / rank  # Tính MRR tại vị trí xuất hiện ĐẦU TIÊN
                
    precision = relevant_count / len(docs) if docs else 0.0
    
    return hit, precision, mrr


def evaluate_retrievers(retrievers_dict, eval_data):
    """
    Đánh giá một list các retriever
    retrievers_dict: dict {"Tên Retriever": retriever_object}
    """
    print("\n" + "="*60)
    print("📊 BẮT ĐẦU ĐÁNH GIÁ CHUYÊN SÂU CÁC RETRIEVER")
    print("="*60)
    
    questions_list = eval_data["questions"] if isinstance(eval_data, dict) else eval_data
    total_q = len(questions_list)
    
    if total_q == 0:
        print("Không có dữ liệu đánh giá.")
        return {}
        
    results = {}
    
    for name, retriever in retrievers_dict.items():
        print(f"⏳ Đang đánh giá: {name}...")
        hits = 0
        precisions = []
        mrrs = []
        
        for item in questions_list:
            q = item["question"]
            truth = item["ground_truth"]
            
            try:
                docs = retriever.invoke(q)
                hit, prec, mrr = calculate_metrics_for_query(docs, truth)
                hits += hit
                precisions.append(prec)
                mrrs.append(mrr)
            except Exception as e:
                print(f"Lỗi ở câu hỏi '{q}': {e}")
                precisions.append(0)
                mrrs.append(0)
                
        metrics = {
            "hit_rate": hits / total_q,
            "precision": sum(precisions) / total_q,
            "mrr": sum(mrrs) / total_q
        }
        results[name] = metrics
        print(f"  👉 Hit Rate (Recall): {metrics['hit_rate']:.2%} | MRR: {metrics['mrr']:.3f} | Precision: {metrics['precision']:.3f}")
        
    plot_retriever_comparison(results)
    return results


def plot_retriever_comparison(results_dict):
    labels = ["Hit Rate (Recall@K)", "MRR Score", "Precision@K"]
    names = list(results_dict.keys())
    
    x = np.arange(len(labels))
    width = 0.8 / len(names) # Dynamic width
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    colors = ['#3498db', '#e67e22', '#2ecc71', '#9b59b6', '#e74c3c']
    
    for i, name in enumerate(names):
        metrics = results_dict[name]
        values = [metrics["hit_rate"], metrics["mrr"], metrics["precision"]]
        
        # Calculate offset for each bar group
        offset = (i - len(names)/2 + 0.5) * width
        rects = ax.bar(x + offset, values, width, label=name, color=colors[i % len(colors)], alpha=0.8)
        
        # Add labels on top of bars
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:.2f}',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=9, rotation=0)

    ax.set_ylabel('Score (0.0 - 1.0)', fontweight='bold')
    ax.set_title('Đánh giá chất lượng RAG: So sánh các hệ thống Retriever', fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontweight='bold')
    ax.set_ylim(0, 1.15)
    ax.legend(loc='upper right')
    
    plt.tight_layout()
    plt.savefig("retriever_comparison.png")
    print("✅ Đã lưu biểu đồ vào file 'retriever_comparison.png'")
    plt.show()


# ================== Hallucination Rate Evaluation ==================

def calculate_hallucination_score(llm, answer: str, ground_truth: str, context: str) -> float:
    from langchain_core.messages import HumanMessage

    judge_prompt = f"""Bạn là chuyên gia đánh giá chất lượng câu trả lời RAG.

            Đánh giá xem câu trả lời có bịa đặt thông tin không có trong context không.

            Context: {context}

            Ground Truth: {ground_truth}

            Câu trả lời cần đánh giá: {answer}

            Chỉ trả về JSON duy nhất, không giải thích:
            {{"hallucination_score": 0.0}}

            Trong đó hallucination_score từ 0.0 đến 1.0:
            - 0.0: Hoàn toàn bám sát context, không bịa
            - 0.5: Một phần bịa hoặc suy diễn quá mức  
            - 1.0: Hoàn toàn bịa, không có trong context"""

    try:
        response = llm.invoke([HumanMessage(content=judge_prompt)])
        import json, re
        text = response.content.strip()
        match = re.search(r'\{.*?\}', text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            return float(data.get("hallucination_score", 0.5))
    except Exception as e:
        print(f"⚠️ Judge lỗi: {e}")
    return 0.5


def evaluate_hallucination(llm, prompt_template, retriever, eval_data, 
                           system_name="System", use_compression=False):
    from rag_core.generation.answer import generate_answer
    from rag_core.generation.context_compression import compress_context

    questions_list = eval_data["questions"] if isinstance(eval_data, dict) else eval_data
    hallucination_scores = []
    details = []

    for item in questions_list:
        q = item["question"]
        truth = item["ground_truth"]

        try:
            docs = retriever.invoke(q)
            raw_context = "\n\n".join(d.page_content for d in docs)

            # Chỉ compress nếu được bật
            if use_compression:
                compressed = compress_context(llm, docs, q)
                context = compressed if compressed.strip() else raw_context
            else:
                context = raw_context

            answer = generate_answer(llm, prompt_template, context, q)
            hal_score = calculate_hallucination_score(llm, answer, truth, context)
            hallucination_scores.append(hal_score)
            details.append({
                "question": q,
                "answer": answer,
                "ground_truth": truth,
                "context": context,
                "hallucination_score": hal_score
            })

        except Exception as e:
            print(f"❌ Lỗi xử lý câu hỏi '{q}': {str(e)}")
            hallucination_scores.append(1.0)

    avg_hallucination = sum(hallucination_scores) / len(hallucination_scores) if hallucination_scores else 0.0

    return {
        "system_name": system_name,
        "hallucination_rate": avg_hallucination,
        "avg_score": avg_hallucination,
        "total_questions": len(questions_list),
        "details": details
    }


def compare_hallucination_baseline_vs_optimized(
    llm,
    prompt_template,
    retriever_baseline,
    retriever_optimized,
    eval_data
):
    """
    So sánh hallucination rate giữa baseline và optimized version
    
    Returns:
        dict: {
            "baseline_rate": float,
            "optimized_rate": float,
            "reduction_percentage": float (% giảm),
            "details": {...}
        }
    """
    
    print("\n" + "="*60)
    print("📊 ĐÁNH GIÁ HALLUCINATION: BASELINE vs OPTIMIZED")
    print("="*60)
    
    # Đánh giá baseline
    print("\n⏳ Đánh giá Baseline (retriever cơ bản)...")
    baseline_results = evaluate_hallucination(
        llm, prompt_template, retriever_baseline, eval_data,
        system_name="Baseline", use_compression=False
    )
    
    # Đánh giá optimized
    print("⏳ Đánh giá Optimized (hybrid retrieval + context compression)...")
    optimized_results = evaluate_hallucination(
        llm, prompt_template, retriever_optimized, eval_data,
        system_name="Optimized", use_compression=True
    )
    
    baseline_rate = baseline_results["hallucination_rate"]
    optimized_rate = optimized_results["hallucination_rate"]
    
    # Tính tỉ lệ giảm
    if baseline_rate > 0:
        reduction_percentage = ((baseline_rate - optimized_rate) / baseline_rate) * 100
    else:
        reduction_percentage = 0.0
    
    # In báo cáo
    print("\n" + "="*60)
    print("📈 KẾT QUẢ")
    print("="*60)
    print(f"✅ Baseline Hallucination Rate:  {baseline_rate:.2%}")
    print(f"✅ Optimized Hallucination Rate: {optimized_rate:.2%}")
    print(f"\n🎯 Giảm hallucination: {reduction_percentage:.1f}%")
    print("="*60 + "\n")
    
    return {
        "baseline_rate": baseline_rate,
        "optimized_rate": optimized_rate,
        "reduction_percentage": reduction_percentage,
        "baseline_details": baseline_results["details"],
        "optimized_details": optimized_results["details"]
    }


def plot_hallucination_comparison(baseline_rate, optimized_rate, reduction_pct):
    """
    Vẽ biểu đồ so sánh hallucination rate
    """
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    # Biểu đồ cột - So sánh tỉ lệ
    systems = ['Baseline', 'Optimized']
    rates = [baseline_rate, optimized_rate]
    colors = ['#e74c3c', '#27ae60']
    
    bars = ax1.bar(systems, rates, color=colors, alpha=0.7, edgecolor='black', linewidth=2)
    ax1.set_ylabel('Hallucination Rate (%)', fontsize=11, fontweight='bold')
    ax1.set_title('Hallucination Rate Comparison', fontsize=12, fontweight='bold')
    ax1.set_ylim(0, max(rates) * 1.2)
    
    # Thêm giá trị lên top cột
    for bar, rate in zip(bars, rates):
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'{rate:.1%}', ha='center', va='bottom', fontweight='bold', fontsize=10)
    
    # Biểu đồ tròn - Tỉ lệ giảm
    labels = [f'Reduced\n({reduction_pct:.1f}%)', f'Remaining\n({100-reduction_pct:.1f}%)']
    sizes = [reduction_pct, 100-reduction_pct]
    colors_pie = ['#2ecc71', '#95a5a6']
    
    wedges, texts, autotexts = ax2.pie(
        sizes, labels=labels, colors=colors_pie, autopct='%1.1f%%',
        startangle=90, textprops={'fontsize': 10, 'fontweight': 'bold'}
    )
    ax2.set_title('Hallucination Reduction', fontsize=12, fontweight='bold')
    
    plt.tight_layout()
    plt.show()