package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProjectStatus;
import com.knowledgehub.entity.ProjectType;

import java.time.Instant;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        String name,
        String description,
        ProjectType type,
        ProjectStatus status,
        boolean pinned,
        String repositoryUrl,
        int tasks,
        int members,
        UUID ownerId,
        Instant createdAt,
        Instant updatedAt) {
}
