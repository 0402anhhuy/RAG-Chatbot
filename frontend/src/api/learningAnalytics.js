import { request } from "./client";

// Số liệu học tập của tab Analytics (Academy Hub). Mọi con số do BE tính từ các
// lượt làm bài đã nộp, tin nhắn và ghi chú — FE chỉ hiển thị.
export const learningAnalyticsApi = {
    // range: "7d" | "30d" | "all"
    get: ({ ownerId, workspaceId, userId, range } = {}) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (workspaceId) params.set("workspaceId", workspaceId);
        if (userId) params.set("userId", userId);
        if (range) params.set("range", range);
        const query = params.toString();
        return request(`/learning-analytics${query ? `?${query}` : ""}`);
    },
};
