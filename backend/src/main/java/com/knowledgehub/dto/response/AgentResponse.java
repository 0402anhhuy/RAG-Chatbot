package com.knowledgehub.dto.response;

import com.knowledgehub.entity.AgentType;
import com.knowledgehub.entity.ProjectAgent;

import java.time.Instant;
import java.util.UUID;

/**
 * Agent trả về cho tab Agents.
 *
 * @param permissions permission preset hiển thị trên card
 * @param iconKey id icon (UI map sang component lucide tương ứng)
 */
public record AgentResponse(
        UUID id,
        UUID projectId,
        String name,
        String description,
        AgentType type,
        String templateKey,
        String color,
        String iconKey,
        String permissions,
        String prompt,
        Instant createdAt,
        Instant updatedAt) {

    public static AgentResponse fromEntity(ProjectAgent entity) {
        return new AgentResponse(
                entity.getId(),
                entity.getProject() != null ? entity.getProject().getId() : null,
                entity.getName(),
                entity.getDescription(),
                entity.getType(),
                entity.getTemplateKey(),
                entity.getColor(),
                entity.getIconKey(),
                entity.getPermissionPreset(),
                entity.getPrompt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    public boolean editable() {
        return type == AgentType.CUSTOM;
    }
}
