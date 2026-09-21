package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ChatSessionCreateRequest(
        @NotNull(message = "ownerId không được để trống")
        UUID ownerId,

        UUID workspaceId,

        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        String title
) {}