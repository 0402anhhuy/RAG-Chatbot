package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Sửa thông tin đề. Field null = giữ nguyên. Câu hỏi được quản lý riêng ở
 * {@code QuizCreateRequest.QuestionPayload} qua endpoint thêm câu.
 */
public record QuizUpdateRequest(
        @Size(max = 50)
        String courseCode,
        @Size(max = 200)
        String courseTitle,
        @Size(max = 255)
        String title,
        String difficulty,
        @Min(0)
        @Max(500)
        Integer timeMinutes,
        Boolean archived) {

}
