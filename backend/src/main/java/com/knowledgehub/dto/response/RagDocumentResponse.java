package com.knowledgehub.dto.response;

import com.knowledgehub.entity.RagDocumentStatus;
import java.time.Instant;
import java.util.Map;

/**
 * Catalog record ở dạng camelCase cho rag-service. Trạng thái được trả kèm
 * {@code documentStatus} viết dạng wire (queued/processing/ready...) để hai bên
 * không phải đoán cách serialize enum.
 */
public record RagDocumentResponse(
        String documentId,
        String workspaceId,
        String courseCode,
        String fileName,
        String checksum,
        RagDocumentStatus status,
        int chunkCount,
        String jobId,
        Instant createdAt,
        Instant updatedAt,
        String sourcePath,
        String error,
        Map<String, Object> metadata,
        String documentStatus) {
}
