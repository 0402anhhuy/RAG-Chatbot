package com.knowledgehub.rag;

import com.knowledgehub.dto.request.UsageEventRequest;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.service.interfaces.AnalyticsService;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Ghi usage do rag-service trả về thành UsageEvent. Best-effort: lỗi analytics
 * không được làm hỏng câu trả lời chat.
 */
@Component
public class RagUsageRecorder {

    private final AnalyticsService analyticsService;

    public RagUsageRecorder(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    public void record(UUID projectId, UUID userId, Map<String, Object> response) {
        if (projectId == null || response == null) {
            return;
        }
        Map<String, Object> usage = optionalMap(response.get("usage"));
        if (usage.isEmpty()) {
            return;
        }
        ProviderType provider = providerOf(Objects.toString(usage.get("provider"), ""));
        if (provider == null) {
            return;
        }
        try {
            analyticsService.recordUsage(projectId, new UsageEventRequest(
                    provider,
                    Objects.toString(usage.get("model"), "unknown"),
                    longValue(usage.get("prompt_tokens")),
                    longValue(usage.get("completion_tokens")),
                    longValue(usage.get("cache_read_tokens")),
                    longValue(usage.get("cache_write_tokens")),
                    1L,
                    0,
                    0,
                    0,
                    userId,
                    "ACTIVE",
                    "COMPLETED",
                    false,
                    true,
                    null,
                    null));
        } catch (RuntimeException exception) {
            // Best-effort by design.
        }
    }

    private static ProviderType providerOf(String provider) {
        return switch (provider == null ? "" : provider.trim().toLowerCase(Locale.ROOT)) {
            case "fpt", "fpt_cloud", "fpt-cloud" -> ProviderType.FPT_CLOUD;
            case "openai" -> ProviderType.OPENAI;
            case "anthropic" -> ProviderType.ANTHROPIC;
            case "gemini", "google" -> ProviderType.GOOGLE;
            default -> null;
        };
    }

    private static Long longValue(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private static Map<String, Object> optionalMap(Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            return Map.of();
        }
        Map<String, Object> result = new HashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (entry.getKey() instanceof String key) {
                result.put(key, entry.getValue());
            }
        }
        return result;
    }
}
