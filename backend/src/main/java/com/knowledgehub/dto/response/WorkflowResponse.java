package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProjectWorkflow;
import com.knowledgehub.entity.WorkflowRunStatus;
import com.knowledgehub.entity.WorkflowType;

import java.time.Instant;
import java.util.UUID;

/**
 * Workflow template trả về cho tab Workflows.
 *
 * @param stepsSummary chuỗi mô tả các bước (hiển thị trên card)
 * @param nodeCount số node trong luồng
 * @param editable true nếu là workflow CUSTOM (được đổi tên / xoá)
 */
public record WorkflowResponse(
        UUID id,
        UUID projectId,
        String name,
        String description,
        WorkflowType type,
        String templateKey,
        String stepsSummary,
        int nodeCount,
        String color,
        String iconKey,
        WorkflowRunStatus lastRunStatus,
        Instant lastRunAt,
        Instant createdAt,
        Instant updatedAt) {

    public static WorkflowResponse fromEntity(ProjectWorkflow entity) {
        return new WorkflowResponse(
                entity.getId(),
                entity.getProject() != null ? entity.getProject().getId() : null,
                entity.getName(),
                entity.getDescription(),
                entity.getType(),
                entity.getTemplateKey(),
                entity.getStepsSummary(),
                entity.getNodeCount(),
                entity.getColor(),
                entity.getIconKey(),
                entity.getLastRunStatus(),
                entity.getLastRunAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    public boolean editable() {
        return type == WorkflowType.CUSTOM;
    }
}
