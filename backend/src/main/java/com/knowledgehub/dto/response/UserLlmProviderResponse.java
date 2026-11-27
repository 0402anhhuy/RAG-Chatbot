package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProviderEndpoint;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.UserLlmProvider;

import java.time.Instant;
import java.util.UUID;

/**
 * Trạng thái provider của user. API key KHÔNG bao giờ trả về nguyên văn, chỉ
 * trả maskedKey (ví dụ "sk-••AB12") để UI hiển thị "đã kết nối".
 */
public record UserLlmProviderResponse(
        UUID id,
        ProviderType provider,
        String providerLabel,
        String endpointCode,
        String endpointLabel,
        String baseUrl,
        String model,
        String maskedKey,
        boolean connected,
        Instant updatedAt) {

    public static UserLlmProviderResponse fromEntity(UserLlmProvider entity) {
        ProviderEndpoint endpoint = ProviderEndpoint.fromCode(entity.getEndpointCode());
        return new UserLlmProviderResponse(
                entity.getId(),
                entity.getProviderType(),
                label(entity.getProviderType()),
                endpoint != null ? endpoint.name() : null,
                endpoint != null ? endpoint.getLabel() : null,
                endpoint != null ? endpoint.getBaseUrl() : null,
                entity.getModel(),
                maskKey(entity.getApiKey()),
                true,
                entity.getUpdatedAt());
    }

    public static UserLlmProviderResponse disconnected(ProviderType providerType) {
        ProviderEndpoint endpoint = ProviderEndpoint.values().length > 0
                ? ProviderEndpoint.values()[0]
                : null;
        return new UserLlmProviderResponse(
                null,
                providerType,
                label(providerType),
                null,
                endpoint != null ? endpoint.getLabel() : null,
                null,
                null,
                null,
                false,
                null);
    }

    private static String label(ProviderType providerType) {
        return switch (providerType) {
            case FPT_CLOUD ->
                "FPT Smart Cloud";
            case OPENAI ->
                "OpenAI";
            case ANTHROPIC ->
                "Anthropic Claude";
            case GOOGLE ->
                "Google Gemini";
        };
    }

    static String maskKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }
        String trimmed = apiKey.trim();
        if (trimmed.length() <= 8) {
            return "••";
        }
        return trimmed.substring(0, 4) + "••" + trimmed.substring(trimmed.length() - 4);
    }
}
