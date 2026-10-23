package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DocumentCreateRequest(
        @NotBlank @Size(max = 255) String filename,
        @Size(max = 20) String fileType,
        Long fileSizeBytes,
        String fileSizeFormatted,
        @Size(max = 4000) String storagePath,
        @Size(max = 50) String courseCode) {
}