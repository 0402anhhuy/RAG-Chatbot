package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Cập nhật trạng thái job (running/succeeded/failed). {@code error} null nghĩa
 * là xóa lỗi cũ.
 */
public record RagIngestJobUpdateRequest(
        @NotBlank @Size(max = 20) String status,
        @PositiveOrZero Integer totalChunks,
        Double progress,
        String error) {
}
