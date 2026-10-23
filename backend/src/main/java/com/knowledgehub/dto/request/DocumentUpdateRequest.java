package com.knowledgehub.dto.request;

import com.knowledgehub.entity.DocumentStatus;
import jakarta.validation.constraints.Size;

public record DocumentUpdateRequest(
        @Size(max = 255) String filename,
        @Size(max = 20) String fileType,
        Long fileSizeBytes,
        String fileSizeFormatted,
        @Size(max = 4000) String storagePath,
        @Size(max = 50) String courseCode,
        DocumentStatus status,
        Integer chunkCount) {
}