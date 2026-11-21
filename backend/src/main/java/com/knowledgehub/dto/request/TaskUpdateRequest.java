package com.knowledgehub.dto.request;

import com.knowledgehub.entity.TaskPriority;
import com.knowledgehub.entity.TaskStatus;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record TaskUpdateRequest(
        @Size(max = 255)
        String title,
        @Size(max = 5000)
        String description,
        UUID projectId,
        UUID assigneeId,
        String assigneeEmail,
        TaskStatus status,
        TaskPriority priority,
        List<String> labels,
        @Size(max = 50)
        String storyPoints,
        @Size(max = 50)
        String originalEstimate,
        @Size(max = 50)
        String remainingEstimate) {

}
