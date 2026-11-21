package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Gửi câu hỏi trong notebook. Nguồn tham chiếu lấy từ sources đang bật của
 * conversation, không cần client gửi lại.
 */
public record StudyMessageRequest(
        @NotBlank(message = "message is required")
        @Size(max = 2000)
        String message) {

}
