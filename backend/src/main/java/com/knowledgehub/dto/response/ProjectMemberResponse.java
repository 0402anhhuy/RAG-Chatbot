package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProjectMember;
import com.knowledgehub.entity.ProjectMemberRole;

import java.time.Instant;
import java.util.UUID;

public record ProjectMemberResponse(
        UUID id,
        UUID userId,
        String name,
        String email,
        ProjectMemberRole role,
        Instant joinedAt) {

    public static ProjectMemberResponse fromEntity(ProjectMember entity) {
        var user = entity.getUser();
        return new ProjectMemberResponse(
                entity.getId(),
                user != null ? user.getId() : null,
                user != null ? user.getName() : null,
                user != null ? user.getEmail() : null,
                entity.getRole(),
                entity.getJoinedAt());
    }
}
