package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.Map;

/**
 * Tạo một ingest job trong hàng đợi bền của BE. {@code jobId} do rag-service
 * sinh để hai bên dùng chung một khóa.
 */
public record RagIngestJobCreateRequest(
        @Size(max = 64) String jobId,
        @Size(max = 64) String documentId,
        String sourcePath,
        @Size(max = 128) String checksum,
        @Min(1) @Max(20) Integer maxAttempts,
        Map<String, Object> metadata) {
}
