package com.knowledgehub.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.PositiveOrZero;

public record ChatSessionTokenUsageRequest(
        @PositiveOrZero(message = "promptTokens phải lớn hơn hoặc bằng 0")
        Long promptTokens,
        @PositiveOrZero(message = "completionTokens phải lớn hơn hoặc bằng 0")
        Long completionTokens,
        @DecimalMin(value = "0.0", message = "cost phải lớn hơn hoặc bằng 0")
        Double cost
        ) {

}
