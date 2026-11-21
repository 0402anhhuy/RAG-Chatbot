package com.knowledgehub.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Dữ liệu tab Tools (Academy Hub): catalog 4 công cụ kèm số liệu thật tính từ
 * các lượt chạy, tài liệu nguồn của user và các đề đã tạo.
 *
 * <p>
 * Mọi con số ở đây đọc từ DB; khi user chưa dùng tool nào thì {@code metrics}
 * là chuỗi mô tả "<i>chưa chạy lần nào</i>" thay vì số ảo.
 * </p>
 *
 * @param documentCount tổng số tài liệu đã index trong các workspace của user —
 * dùng cho card Courseware
 */
public record AcademyToolsResponse(
        int documentCount,
        int activeToolCount,
        List<Tool> tools) {

    /**
     * Một card công cụ.
     *
     * @param id khớp {@code activeSubTool} của AcademyHub
     * @param metrics chuỗi số liệu thật cho dòng bottom của card
     * @param runs số lượt chạy đã hoàn tất
     * @param lastRunAt chuỗi thời gian tương đối của lượt chạy gần nhất
     * @param primaryAction nhãn nút chính ("Launch" hoặc khác khi chưa đủ điều
     * kiện chạy)
     */
    public record Tool(
            String id,
            String title,
            String description,
            String badge,
            String accent,
            String metrics,
            int runs,
            String lastRunAt,
            boolean runnable,
            String primaryAction,
            String blockedReason) {

    }

    /**
     * Kết quả một lượt chạy.
     *
     * @param status queued | running | completed | failed
     * @param citations tài liệu được tham chiếu (courseware / tutor)
     */
    public record RunResult(
            UUID runId,
            String toolId,
            String status,
            String summary,
            List<Citation> citations,
            List<Suggestion> suggestions,
            UUID quizId,
            String quizTitle,
            int suggestedQuestionCount,
            String createdAt) {

    }

    /**
     * Một tài liệu được tham chiếu trong kết quả.
     *
     * @param scorePercent điểm khớp 0..100 (null khi không tính được điểm số)
     * @param matchedTerms các từ khoá của câu hỏi có xuất hiện trong tài liệu
     */
    public record Citation(
            UUID documentId,
            String name,
            String courseCode,
            String fileType,
            int scorePercent,
            List<String> matchedTerms,
            String snippet) {

    }

    /**
     * Gợi ý học tiếp, dựa trên tài liệu nguồn thật của user.
     *
     * @param toolId tool mở được từ gợi ý này
     */
    public record Suggestion(
            String toolId,
            String label,
            String prompt) {

    }
}
