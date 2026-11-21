package com.knowledgehub.dto.response;

import java.util.List;

/**
 * Kết quả tra cứu tài liệu cho rag-service: tập id đã ready và text các chunk.
 */
public record RagDocumentContextResponse(
        String workspaceId,
        List<String> readyDocumentIds,
        List<RagChunkResponse> chunks) {
}
