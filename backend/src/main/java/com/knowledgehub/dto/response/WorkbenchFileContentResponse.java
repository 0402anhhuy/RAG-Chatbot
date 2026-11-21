package com.knowledgehub.dto.response;

import com.knowledgehub.entity.WorkbenchFile;

import java.time.Instant;
import java.util.UUID;

/**
 * Nội dung file đang mở trong editor của tab IDE.
 */
public record WorkbenchFileContentResponse(
        UUID id,
        String path,
        String name,
        String extension,
        String language,
        String content,
        long sizeBytes,
        int lineCount,
        boolean editedByUser,
        Instant updatedAt) {

    public static WorkbenchFileContentResponse fromEntity(WorkbenchFile entity) {
        return new WorkbenchFileContentResponse(
                entity.getId(),
                entity.getPath(),
                entity.getName(),
                entity.getExtension(),
                WorkbenchFileResponse.languageOf(entity.getExtension()),
                entity.getContent() != null ? entity.getContent() : "",
                entity.getSizeBytes(),
                entity.getLineCount(),
                entity.isEditedByUser(),
                entity.getUpdatedAt());
    }
}
