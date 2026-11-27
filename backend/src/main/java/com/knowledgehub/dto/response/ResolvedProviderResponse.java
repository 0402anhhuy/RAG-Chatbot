package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProviderType;

import java.util.List;

/**
 * Cấu hình provider đã giải mã, chỉ trả cho rag-service qua endpoint nội bộ.
 * TUYỆT ĐỐI không log response này.
 */
public record ResolvedProviderResponse(
        ProviderType provider,
        String providerLabel,
        String endpointCode,
        String baseUrl,
        String model,
        String apiKey,
        String purpose,
        List<String> capabilities) {
}
