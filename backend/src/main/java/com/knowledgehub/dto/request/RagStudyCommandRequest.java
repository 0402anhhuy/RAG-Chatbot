package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

/**
 * Yêu cầu sinh flashcard/đề thi từ tài liệu đã chọn (endpoint nội bộ cho
 * rag-service).
 */
public record RagStudyCommandRequest(
        @NotBlank String workspaceId,
        String documentId,
        List<String> documentIds,
        @Min(1) @Max(50) Integer maxItems) {
}
