package com.knowledgehub.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Tạo/cập nhật đơn giá token của một model (USD cho 1 triệu token).
 */
public record ProviderModelPriceRequest(
        @NotBlank(message = "model is required")
        @Size(max = 120)
        String model,
        @NotNull(message = "inputPerMillion is required")
        @DecimalMin(value = "0.0")
        BigDecimal inputPerMillion,
        @NotNull(message = "outputPerMillion is required")
        @DecimalMin(value = "0.0")
        BigDecimal outputPerMillion,
        @DecimalMin(value = "0.0")
        BigDecimal cacheReadPerMillion,
        @DecimalMin(value = "0.0")
        BigDecimal cacheWritePerMillion) {

}
