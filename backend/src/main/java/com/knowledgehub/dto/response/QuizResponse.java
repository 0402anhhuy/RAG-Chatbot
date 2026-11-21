package com.knowledgehub.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Một đề kiểm tra ở tab Quizzes.
 *
 * @param status NEW | IN_PROGRESS | COMPLETED (suy ra từ các lượt làm, không
 * lưu sẵn)
 * @param score điểm cao nhất đã đạt, "%"; null nếu chưa nộp lần nào
 * @param lastAttempt "2 days ago" / "Today" / "Never"
 * @param sampleQuestion câu hỏi đầu tiên để xem trước; null nếu đề chưa có câu
 * nào
 */
public record QuizResponse(
        UUID id,
        UUID workspaceId,
        String courseCode,
        String courseTitle,
        String title,
        String difficulty,
        int totalQuestions,
        int timeMinutes,
        String status,
        String score,
        Integer scorePercent,
        String lastAttempt,
        int attempts,
        SampleQuestion sampleQuestion) {

    /**
     * Câu hỏi xem trước. correctIndex trả về để UI tô đúng đáp án sau khi bấm
     * "Verify Answer"; explanation là lời giải, ragSource là nguồn tham chiếu.
     */
    public record SampleQuestion(
            UUID id,
            String text,
            List<String> options,
            int correct,
            String explanation,
            String ragSource) {

    }
}
