package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

/**
 * Payload rag-service gửi khi bắt đầu ingest một tài liệu: tạo/cập nhật bản ghi
 * trong RAG catalog của BE.
 */
public record RagDocumentRegisterRequest(
        String workspaceId,
        @Size(max = 50) String courseCode,
        @NotBlank @Size(max = 255) String filename,
        @NotBlank String sourcePath,
        @NotBlank @Size(max = 128) String checksum,
        Map<String, Object> metadata) {
}
