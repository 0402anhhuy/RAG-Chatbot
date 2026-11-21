package com.knowledgehub.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ChatSessionResponse(
        UUID id,
        String title,
        UUID ownerId,
        UUID workspaceId,
        String workspaceName,
        UUID projectId,
        String projectName,
        String model,
        long promptTokens,
        long completionTokens,
        long totalTokens,
        double totalCost,
        boolean archived,
        boolean bookmarked,
        Instant archivedAt,
        Instant createdAt,
        Instant updatedAt) {

}
