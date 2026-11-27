"""Generate the synthetic Vietnamese golden set (no PII, deterministic)."""

from __future__ import annotations

import json
from pathlib import Path

TOPICS = [
    ("học máy", "Học máy là một lĩnh vực của trí tuệ nhân tạo, xây dựng mô hình từ dữ liệu để nhận diện mẫu và đưa ra dự đoán cho dữ liệu mới.", "AI"),
    ("truy xuất tăng cường", "Truy xuất tăng cường kết hợp tìm kiếm tài liệu với mô hình ngôn ngữ để câu trả lời bám sát nguồn đã được kiểm chứng.", "RAG"),
    ("cơ sở dữ liệu vector", "Cơ sở dữ liệu vector lưu biểu diễn số của văn bản và tìm các vector gần nhất theo độ tương đồng cosine hoặc tích vô hướng.", "RAG"),
    ("BM25", "BM25 xếp hạng tài liệu theo tần suất từ khóa, độ hiếm của từ và độ dài tài liệu, phù hợp cho tìm kiếm từ vựng chính xác.", "Retrieval"),
    ("reranking", "Reranking dùng một mô hình thứ hai để chấm lại thứ tự các ứng viên đã được truy xuất, giúp đưa đoạn liên quan nhất lên đầu.", "Retrieval"),
    ("tokenization", "Tokenization chia văn bản thành các đơn vị nhỏ như từ hoặc âm tiết để mô hình và bộ đếm token xử lý thống nhất.", "NLP"),
    ("embedding", "Embedding biến văn bản thành vector số sao cho các đoạn có ngữ nghĩa gần nhau nằm gần nhau trong không gian vector.", "NLP"),
    ("chunking", "Chunking chia tài liệu dài thành các đoạn nhỏ có ngân sách token và độ chồng lấn hợp lý để truy xuất chính xác hơn.", "Ingest"),
    ("đánh giá truy xuất", "Đánh giá truy xuất đo Recall, Precision, MRR và nDCG trên một tập câu hỏi có đáp án liên quan đã được gán nhãn.", "Eval"),
    ("bảo mật API", "Bảo mật API yêu cầu xác thực bằng khóa, phân quyền theo workspace và không ghi khóa bí mật vào log hay phản hồi.", "Security"),
    ("sao lưu dữ liệu", "Sao lưu dữ liệu cần lưu bản sao nhất quán, kiểm tra khả năng khôi phục định kỳ và bảo vệ bản sao bằng mã hóa.", "Ops"),
    ("kiến trúc microservices", "Kiến trúc microservices tách hệ thống thành các dịch vụ nhỏ, giao tiếp qua API và triển khai độc lập theo miền nghiệp vụ.", "Architecture"),
    ("Docker", "Docker đóng gói ứng dụng cùng thư viện vào image để chạy nhất quán trên nhiều môi trường khác nhau.", "DevOps"),
    ("Kubernetes", "Kubernetes điều phối container, tự động mở rộng, cân bằng tải và thay thế các pod bị lỗi theo khai báo.", "DevOps"),
    ("PostgreSQL", "PostgreSQL là hệ quản trị dữ liệu quan hệ hỗ trợ giao dịch ACID, chỉ mục phong phú và kiểu dữ liệu JSON.", "Database"),
    ("Redis", "Redis là kho dữ liệu trong bộ nhớ thường dùng cho cache, hàng đợi nhẹ và giới hạn tần suất truy cập.", "Database"),
    ("hàng đợi công việc", "Hàng đợi công việc giúp xử lý tác vụ nền bất đồng bộ, retry khi lỗi và tách tải khỏi luồng yêu cầu chính.", "Backend"),
    ("caching", "Caching lưu kết quả đã tính để giảm độ trễ và chi phí, nhưng cần chiến lược hết hạn và vô hiệu hóa đúng lúc.", "Backend"),
    ("observability", "Observability dùng log, metric và trace để hiểu hệ thống đang chạy, phát hiện lỗi và đo hiệu năng thực tế.", "Ops"),
    ("prompt engineering", "Prompt engineering thiết kế chỉ dẫn, ví dụ và ràng buộc đầu ra để mô hình trả lời ổn định và đúng định dạng.", "LLM"),
]

QUESTIONS = [
    "Theo tài liệu, {topic} là gì?",
    "Tài liệu mô tả {topic} như thế nào?",
    "Vì sao {topic} quan trọng?",
    "{topic} gồm những thành phần hoặc đặc điểm nào?",
    "Tài liệu nói gì về {topic}?",
]


def main() -> None:
    out = Path(__file__).with_name("vi_golden.jsonl")
    rows: list[dict[str, object]] = []
    index = 0
    for topic, fact, domain in TOPICS:
        for template in QUESTIONS:
            index += 1
            question = template.format(topic=topic)
            distractors = "\n\n".join(
                f"Ghi chú vận hành {index + 1} về {domain}: nhóm dự án nhắc lại câu hỏi “{question}” "
                f"trong nhiều buổi trao đổi, sau đó bàn về quy trình, chi phí, lịch triển khai và các bước "
                f"kiểm thử. Đoạn này chỉ mô tả bối cảnh, không đưa ra câu trả lời cho {topic}."
                for index in range(30)
            )
            document = (
                f"Tài liệu nội bộ về {domain}. Phần mở đầu trình bày bối cảnh chung và phạm vi áp dụng.\n\n"
                f"{distractors}\n\n"
                f"{fact}\n\n"
                f"Phần kết luận nhấn mạnh việc ghi lại quyết định và theo dõi chất lượng sau khi triển khai."
            )
            rows.append(
                {
                    "id": f"vi-{index:03d}",
                    "question": question,
                    "document": document,
                    "relevant_spans": [fact],
                    "tags": ["synthetic", domain],
                    "workspace_id": f"eval-vi-{index:03d}",
                }
            )
    out.write_text(
        "\n".join(json.dumps(row, ensure_ascii=False) for row in rows) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(rows)} cases to {out}")


if __name__ == "__main__":
    main()
