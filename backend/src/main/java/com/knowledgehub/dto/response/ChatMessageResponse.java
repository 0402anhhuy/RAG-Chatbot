package com.knowledgehub.dto.response;

import com.knowledgehub.entity.MessageRole;
import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID sessionId,
        MessageRole role,
        String content,
        String sources,
        Instant createdAt) {
}
