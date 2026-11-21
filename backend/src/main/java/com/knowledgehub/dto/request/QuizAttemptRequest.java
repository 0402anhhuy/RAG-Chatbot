package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Bắt đầu / nộp một lượt làm bài.
 *
 * @param correctCount số câu đúng (chỉ dùng khi submit, mặc định 0)
 * @param questionCount tổng số câu của lượt; null thì BE lấy số câu hiện có của
 * đề
 */
public record QuizAttemptRequest(
        @Min(0)
        @Max(500)
        Integer correctCount,
        @Min(0)
        @Max(500)
        Integer questionCount) {

}
