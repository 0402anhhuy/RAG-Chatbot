package com.knowledgehub.dto.response;

import java.util.List;
import java.util.Map;

/**
 * Số liệu tổng quan nền tảng cho Admin Dashboard (Prism Studio).
 */
public record AdminDashboardResponse(
        long totalUsers,
        long activeUsers,
        long adminUsers,
        long newUsers,
        double userTrendPct,
        long totalProjects,
        long totalDocuments,
        long totalChatSessions,
        long totalMessages,
        long totalQuizAttempts,
        long totalTasks,
        long aiEvents,
        long aiTokens,
        double aiTrendPct,
        List<ActivityPoint> activitySeries,
        Map<String, Long> roleDistribution,
        List<UserResponse> recentUsers) {

    /** Một điểm dữ liệu theo ngày của biểu đồ hoạt động nền tảng. */
    public record ActivityPoint(
            String date,
            long newUsers,
            long aiEvents) {
    }

    public static AdminDashboardResponse empty() {
        return new AdminDashboardResponse(
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                List.of(), Map.of(), List.of());
    }
}
