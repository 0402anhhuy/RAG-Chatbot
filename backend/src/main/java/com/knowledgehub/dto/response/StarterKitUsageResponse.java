package com.knowledgehub.dto.response;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Hạn mức Starter Kit của user trong chu kỳ hiện tại. spent là số tiền đã tiêu
 * trong chu kỳ (chưa có bảng tracking usage nên hiện trả 0).
 */
public record StarterKitUsageResponse(
        BigDecimal spent,
        BigDecimal limit,
        BigDecimal remaining,
        int percentUsed,
        LocalDate periodStart,
        LocalDate periodEnd,
        int resetDay) {

    public static StarterKitUsageResponse of(
            BigDecimal spent, BigDecimal limit, int resetDay, LocalDate today) {
        BigDecimal safeSpent = spent == null ? BigDecimal.ZERO : spent.max(BigDecimal.ZERO);
        BigDecimal safeLimit = limit == null ? BigDecimal.ZERO : limit.max(BigDecimal.ZERO);

        int percentUsed = 0;
        if (safeLimit.compareTo(BigDecimal.ZERO) > 0) {
            percentUsed = safeSpent.multiply(BigDecimal.valueOf(100))
                    .divide(safeLimit, 0, RoundingMode.HALF_UP)
                    .min(BigDecimal.valueOf(100))
                    .intValue();
        }

        LocalDate effectiveToday = today == null ? LocalDate.now() : today;
        int day = Math.min(Math.max(resetDay, 1), 28);

        LocalDate periodStart = effectiveToday.withDayOfMonth(day);
        if (effectiveToday.getDayOfMonth() < day) {
            periodStart = periodStart.minusMonths(1);
        }
        LocalDate periodEnd = periodStart.plusMonths(1).minusDays(1);

        return new StarterKitUsageResponse(
                safeSpent.setScale(2, RoundingMode.HALF_UP),
                safeLimit.setScale(2, RoundingMode.HALF_UP),
                safeLimit.subtract(safeSpent).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP),
                percentUsed,
                periodStart,
                periodEnd,
                day);
    }
}
