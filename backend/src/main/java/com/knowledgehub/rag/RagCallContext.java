package com.knowledgehub.rag;

import java.util.List;
import java.util.UUID;

/**
 * Danh tính và phạm vi workspace mà Spring forward sang rag-service.
 * RAG dùng các header này để chặn truy cập chéo workspace.
 */
public record RagCallContext(String userId, String projectId, List<String> workspaceIds) {

    public static RagCallContext none() {
        return new RagCallContext(null, null, List.of());
    }

    public static RagCallContext of(UUID userId, UUID projectId, UUID workspaceId) {
        return new RagCallContext(
                userId != null ? userId.toString() : null,
                projectId != null ? projectId.toString() : null,
                workspaceId != null ? List.of(workspaceId.toString()) : List.of());
    }

    public boolean hasUser() {
        return userId != null && !userId.isBlank();
    }
}
