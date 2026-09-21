package com.knowledgehub.dto.request;

import com.knowledgehub.entity.MessageRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageRequest(
        @NotBlank @Size(max = 20000) String content,
        MessageRole role,
        String sources) {
}
