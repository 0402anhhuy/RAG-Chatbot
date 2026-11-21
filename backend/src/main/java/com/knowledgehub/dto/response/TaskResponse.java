package com.knowledgehub.dto.response;

import com.knowledgehub.entity.TaskPriority;
import com.knowledgehub.entity.TaskStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        String title,
        String description,
        UUID projectId,
        String projectName,
        UUID assigneeId,
        String assigneeName,
        String assigneeEmail,
        TaskStatus status,
        String statusLabel,
        TaskPriority priority,
        String priorityLabel,
        List<String> labels,
        String storyPoints,
        String originalEstimate,
        String remainingEstimate,
        boolean archived,
        Instant archivedAt,
        Instant createdAt,
        Instant updatedAt,
        String updatedAtLabel) {

}
