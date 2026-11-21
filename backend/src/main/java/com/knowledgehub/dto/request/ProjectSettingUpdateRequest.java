package com.knowledgehub.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Cập nhật tab Settings. Field null = giữ nguyên, nên client chỉ gửi thứ vừa
 * đổi (mỗi sub-tab có nút Save riêng).
 */
public record ProjectSettingUpdateRequest(
        @Size(max = 150)
        String name,
        @Size(max = 2000)
        String description,
        String excludedPaths,
        @Min(1)
        @Max(24)
        Integer hoursPerDay,
        @Min(1)
        @Max(31)
        Integer daysPerMonth,
        @DecimalMin("0.0")
        BigDecimal referenceRate,
        Boolean allowStarterKit,
        Boolean allowPersonalProviders,
        Boolean budgetTrackingEnabled,
        @DecimalMin("0.0")
        BigDecimal monthlyBudgetLimit) {

}
