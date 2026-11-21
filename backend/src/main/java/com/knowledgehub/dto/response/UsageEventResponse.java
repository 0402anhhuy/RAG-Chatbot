package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProviderType;

import java.util.UUID;

/**
 * Lượt dùng đã được quy ra tiền, trả về cho client sau khi tạo và dùng để làm
 * nguồn dữ liệu cho Analytics. Không chứa nội dung prompt để không lộ dữ liệu.
 */
public record UsageEventResponse(
        UUID id,
        UUID projectId,
        UUID userId,
        String userName,
        ProviderType provider,
        String model,
        String taskStatus,
        String outcomeStatus,
        long promptTokens,
        long completionTokens,
        long cacheReadTokens,
        long cacheWriteTokens,
        long totalTokens,
        int steps,
        int linesAdded,
        int linesRemoved,
        int filesChanged,
        double cost,
        String actorType,
        String occurredAt) {

}
