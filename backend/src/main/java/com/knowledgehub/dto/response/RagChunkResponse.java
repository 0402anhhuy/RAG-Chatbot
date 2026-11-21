package com.knowledgehub.dto.response;

import java.util.Map;

/**
 * Một chunk kèm metadata nguồn (workspace, tên tài liệu) mà retriever của
 * rag-service cần cho việc lọc và trích dẫn.
 */
public record RagChunkResponse(
        String chunkId,
        String documentId,
        int chunkIndex,
        String content,
        Integer pageNumber,
        String sectionPath,
        String checksum,
        String workspaceId,
        String fileName,
        Map<String, Object> metadata) {
}
