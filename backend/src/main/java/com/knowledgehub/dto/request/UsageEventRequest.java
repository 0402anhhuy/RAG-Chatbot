package com.knowledgehub.dto.request;

import com.knowledgehub.entity.ProviderType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Ghi nhận một lượt dùng LLM cho project. Token là số thật, tiền được BE quy ra
 * từ bảng giá {@code provider_model_prices} nên client không tự tính cost.
 */
public record UsageEventRequest(
        @NotNull(message = "provider is required")
        ProviderType provider,
        @NotBlank(message = "model is required")
        @Size(max = 120)
        String model,
        @PositiveOrZero
        Long promptTokens,
        @PositiveOrZero
        Long completionTokens,
        @PositiveOrZero
        Long cacheReadTokens,
        @PositiveOrZero
        Long cacheWriteTokens,
        @PositiveOrZero
        Long steps,
        @PositiveOrZero
        Integer linesAdded,
        @PositiveOrZero
        Integer linesRemoved,
        @PositiveOrZero
        Integer filesChanged,
        /**
         * Ai thực hiện lượt dùng (mặc định là owner project).
         */
        UUID userId,
        /**
         * ACTIVE | ABANDONED
         */
        String taskStatus,
        /**
         * COMPLETED | SKIPPED
         */
        String outcomeStatus,
        Boolean personal,
        Boolean completed,
        @DecimalMin(value = "0.0", message = "cost must be zero or greater")
        Double costOverride,
        /**
         * Thời điểm lượt dùng xảy ra, RFC-1123 / ISO-8601. Bỏ trống = bây giờ.
         */
        String occurredAt) {

}
