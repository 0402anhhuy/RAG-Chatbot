package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Size;

public record WorkspaceUpdateRequest(
        @Size(max = 150) String name,
        @Size(max = 2000) String description) {
}
