package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * rag-service báo tiến trình ingest: đổi trạng thái, số chunk, lỗi (nếu có).
 */
public record RagDocumentStatusUpdateRequest(
        @NotBlank @Size(max = 20) String status,
        @PositiveOrZero Integer chunkCount,
        String error) {
}
