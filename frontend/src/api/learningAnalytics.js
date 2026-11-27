import { buildQuery, request } from "@/api/client.js";

// Số liệu học tập của tab Analytics (Academy Hub). Mọi con số do BE tính từ các
// lượt làm bài đã nộp, tin nhắn và ghi chú — FE chỉ hiển thị.
export const learningAnalyticsApi = {
    // range: "7d" | "30d" | "all"
    get: ({ ownerId, workspaceId, userId, range } = {}) => {
        return request(`/learning-analytics${buildQuery({
            ownerId: ownerId,
            workspaceId: workspaceId,
            userId: userId,
            range: range,
        })}`);
    },
};
