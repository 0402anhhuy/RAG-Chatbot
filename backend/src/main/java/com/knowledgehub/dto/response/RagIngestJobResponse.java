package com.knowledgehub.dto.response;

import com.knowledgehub.entity.RagIngestJobStatus;
import java.time.Instant;

/**
 * Trạng thái ingest job ở dạng mà rag-service dùng để poll.
 */
public record RagIngestJobResponse(
        String jobId,
        String documentId,
        String status,
        double progress,
        int totalChunks,
        int attempts,
        int maxAttempts,
        String error,
        String sourcePath,
        String checksum,
        String documentStatus,
        Instant createdAt,
        Instant updatedAt) {
}
