package com.knowledgehub.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UserSettingUpdateRequest(
        @NotNull
        @DecimalMin(value = "0.00", message = "Starter Kit limit must be zero or greater")
        BigDecimal starterKitMonthlyLimit,
        @Min(value = 1, message = "Reset day must be between 1 and 28")
        @Max(value = 28, message = "Reset day must be between 1 and 28")
        Integer budgetResetDay) {

}
