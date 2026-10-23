package com.knowledgehub.dto.response;

import com.knowledgehub.entity.DocumentStatus;
import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String filename,
        String storagePath,
        UUID workspaceId,
        DocumentStatus status,
        int chunkCount,
        Instant createdAt) {
}
