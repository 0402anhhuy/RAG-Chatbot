package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Tạo ghi chú học tập. workspaceId bỏ trống thì BE lấy theo conversation (hoặc
 * workspace đầu tiên của owner).
 */
public record StudyNoteRequest(
        UUID workspaceId,
        UUID sessionId,
        @NotBlank(message = "title is required")
        @Size(max = 255)
        String title,
        @Size(max = 20000)
        String content) {

}
