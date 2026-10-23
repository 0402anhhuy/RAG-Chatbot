package com.knowledgehub.dto.request;

import com.knowledgehub.entity.DocumentStatus;
import jakarta.validation.constraints.Size;

public record DocumentUpdateRequest(
        @Size(max = 255) String filename,
        @Size(max = 4000) String storagePath,
        DocumentStatus status,
        Integer chunkCount) {
}
