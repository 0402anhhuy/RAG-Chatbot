package com.knowledgehub.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ChatSessionResponse(
        UUID id,
        String title,
        UUID ownerId,
        UUID workspaceId,
        Instant createdAt,
        Instant updatedAt) {
}
