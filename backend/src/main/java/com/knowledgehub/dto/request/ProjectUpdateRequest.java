package com.knowledgehub.dto.request;

import com.knowledgehub.entity.ProjectStatus;
import com.knowledgehub.entity.ProjectType;
import jakarta.validation.constraints.Size;

public record ProjectUpdateRequest(
        @Size(max = 150) String name,
        @Size(max = 2000) String description,
        ProjectType type,
        ProjectStatus status,
        Boolean pinned,
        @Size(max = 500) String repositoryUrl) {
}
