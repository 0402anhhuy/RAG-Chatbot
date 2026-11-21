package com.knowledgehub.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Tạo đề kiểm tra. questions bắt buộc có ít nhất một câu, nếu không thì đề
 * không có gì để làm và "sample preview" sẽ trống.
 */
public record QuizCreateRequest(
        UUID workspaceId,
        @Size(max = 50)
        String courseCode,
        @Size(max = 200)
        String courseTitle,
        @NotBlank(message = "title is required")
        @Size(max = 255)
        String title,
        /**
         * EASY | MEDIUM | HARD
         */
        String difficulty,
        @Min(0)
        @Max(500)
        Integer timeMinutes,
        @Valid
        @NotEmpty(message = "at least one question is required")
        List<QuestionPayload> questions) {

    /**
     * Một câu hỏi. correctIndex là chỉ số (0-based) của đáp án đúng trong
     * options.
     */
    public record QuestionPayload(
            @NotBlank(message = "question text is required")
            String prompt,
            @NotEmpty(message = "options are required")
            List<@NotBlank String> options,
            @Min(0)
            int correctIndex,
            String explanation,
            @Size(max = 255)
            String ragSource) {

    }
}
