package com.knowledgehub.dto.response;

import com.knowledgehub.entity.WorkbenchFile;

import java.time.Instant;
import java.util.UUID;

/**
 * File trong workspace của project (cột Files, tab IDE).
 *
 * @param path đường dẫn tương đối kiểu posix, FE dùng để dựng cây thư mục
 * @param language ngôn ngữ để tô màu cú pháp (suy ra từ extension)
 */
public record WorkbenchFileResponse(
        UUID id,
        UUID projectId,
        String path,
        String name,
        String parentPath,
        String extension,
        String language,
        long sizeBytes,
        int lineCount,
        boolean editedByUser,
        Instant createdAt,
        Instant updatedAt) {

    public static WorkbenchFileResponse fromEntity(WorkbenchFile entity) {
        return new WorkbenchFileResponse(
                entity.getId(),
                entity.getProject() != null ? entity.getProject().getId() : null,
                entity.getPath(),
                entity.getName(),
                entity.getParentPath(),
                entity.getExtension(),
                languageOf(entity.getExtension()),
                entity.getSizeBytes(),
                entity.getLineCount(),
                entity.isEditedByUser(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    /**
     * Map extension sang id ngôn ngữ để FE chọn highlighter.
     */
    public static String languageOf(String extension) {
        if (extension == null) {
            return "plaintext";
        }
        return switch (extension.toLowerCase()) {
            case "java" ->
                "java";
            case "js", "jsx", "mjs" ->
                "javascript";
            case "ts", "tsx" ->
                "typescript";
            case "json" ->
                "json";
            case "css", "scss" ->
                "css";
            case "html", "htm" ->
                "html";
            case "md", "markdown" ->
                "markdown";
            case "py" ->
                "python";
            case "sql" ->
                "sql";
            case "yml", "yaml" ->
                "yaml";
            case "xml" ->
                "xml";
            case "sh", "bash" ->
                "shell";
            case "properties", "env" ->
                "properties";
            default ->
                "plaintext";
        };
    }
}
