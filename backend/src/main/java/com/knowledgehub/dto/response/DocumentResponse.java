package com.knowledgehub.dto.response;

import com.knowledgehub.entity.DocumentStatus;
import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String filename,
        String title,
        String fileType,
        String type,
        Long fileSizeBytes,
        String fileSizeFormatted,
        String size,
        String storagePath,
        String courseCode,
        UUID workspaceId,
        DocumentStatus status,
        int chunkCount,
        int chunks,
        Instant createdAt,
        String uploadedAt) {
}