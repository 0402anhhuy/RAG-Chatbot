package com.knowledgehub.dto.request;

import com.knowledgehub.entity.WorkspaceMemberRole;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record WorkspaceMemberRequest(
        @NotNull UUID userId,
        WorkspaceMemberRole role) {
}
