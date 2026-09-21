package com.knowledgehub.dto.response;

import com.knowledgehub.entity.WorkspaceMemberRole;
import java.time.Instant;
import java.util.UUID;

public record WorkspaceMemberResponse(
        UUID id,
        UUID workspaceId,
        UUID userId,
        WorkspaceMemberRole role,
        Instant joinedAt) {
}
