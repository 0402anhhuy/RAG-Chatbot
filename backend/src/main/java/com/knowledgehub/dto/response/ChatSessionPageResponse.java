package com.knowledgehub.dto.response;

import java.util.List;

public record ChatSessionPageResponse(
        List<ChatSessionResponse> items,
        long totalElements,
        int totalPages,
        int page,
        int size,
        long activeCount,
        long archivedCount,
        long allCount) {

}
