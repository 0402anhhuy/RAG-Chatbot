package com.knowledgehub.dto.response;

import java.util.List;

/**
 * Toàn bộ số liệu cho tab Analytics của một project trong một khoảng thời gian:
 * KPI tổng, cost per outcome, chuỗi theo ngày, bảng theo provider/model và theo
 * user.
 */
public record ProjectAnalyticsResponse(
        String projectName,
        String range,
        String periodLabel,
        String from,
        String to,
        List<String> days,
        Summary summary,
        List<DailyPoint> daily,
        List<ProviderRow> providers,
        List<UserRow> users) {

    /**
     * Các con số KPI ở đầu trang.
     */
    public record Summary(
            double totalCost,
            double projectCost,
            double personalCost,
            long tokensIn,
            long tokensOut,
            long cacheReadTokens,
            long cacheWriteTokens,
            long steps,
            int tasks,
            int completedTasks,
            int abandonedTasks,
            int linesAdded,
            int linesRemoved,
            int netLines,
            int filesChanged,
            int runs,
            double abandonedCost,
            long abandonedTokens,
            List<AbandonedModel> abandoned) {

    }

    public record AbandonedModel(String model, double cost) {

    }

    public record DailyPoint(
            String date,
            String label,
            double project,
            double personal,
            double total,
            long tokensIn,
            long tokensOut,
            int linesAdded,
            int linesRemoved) {

    }

    public record ProviderRow(
            String provider,
            String model,
            double cost,
            long tokensIn,
            long tokensOut,
            long cacheReadTokens,
            long cacheWriteTokens,
            int steps,
            double percent) {

    }

    public record UserRow(
            String userId,
            String name,
            String email,
            double projectCost,
            double personalCost,
            long tokensIn,
            long tokensOut,
            long cacheReadTokens,
            long cacheWriteTokens,
            int steps,
            int linesAdded,
            int linesRemoved,
            int filesChanged,
            int runs) {

    }
}
