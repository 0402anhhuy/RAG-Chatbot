package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Yêu cầu chạy một công cụ học tập.
 *
 * <p>
 * Tool lấy từ path ({@code /tools/{toolId}/run}) nên không nằm trong body.
 * {@code documentIds} là các tài liệu người học tick chọn ở cột nguồn: bỏ trống
 * thì BE dùng tất cả tài liệu đã index của user (tối đa vài chục file gần nhất,
 * xem service).
 * </p>
 *
 * @param prompt câu hỏi / chủ đề; chỉ bắt buộc với tutor và courseware
 * @param difficulty easy | medium | hard (dùng cho exam_prep)
 * @param questionCount số câu muốn sinh (exam_prep)
 */
public record AcademyToolRunRequest(
        List<UUID> documentIds,
        @Size(max = 2000, message = "Prompt must be at most 2000 characters")
        String prompt,
        @Size(max = 200, message = "Topic must be at most 200 characters")
        String topic,
        String difficulty,
        @Min(value = 3, message = "Question count must be at least 3")
        @Max(value = 30, message = "Question count must be at most 30")
        Integer questionCount) {

    /**
     * Câu hỏi hiệu lực: đã trim, rỗng nếu người học chưa nhập.
     */
    public String effectiveQuestion() {
        return prompt == null ? "" : prompt.trim();
    }
}
