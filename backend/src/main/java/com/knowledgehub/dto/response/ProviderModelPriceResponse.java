package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProviderModelPrice;
import com.knowledgehub.entity.ProviderType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProviderModelPriceResponse(
        UUID id,
        ProviderType provider,
        String model,
        BigDecimal inputPerMillion,
        BigDecimal outputPerMillion,
        BigDecimal cacheReadPerMillion,
        BigDecimal cacheWritePerMillion,
        Instant updatedAt) {

    public static ProviderModelPriceResponse fromEntity(ProviderModelPrice entity) {
        return new ProviderModelPriceResponse(
                entity.getId(),
                entity.getProvider(),
                entity.getModel(),
                entity.getInputPerMillion(),
                entity.getOutputPerMillion(),
                entity.getCacheReadPerMillion(),
                entity.getCacheWritePerMillion(),
                entity.getUpdatedAt());
    }
}
