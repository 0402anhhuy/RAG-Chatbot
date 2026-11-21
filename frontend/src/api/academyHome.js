import { request } from "./client";

// Dashboard tab Home (Academy Hub). BE tổng hợp từ courses, quizzes/attempts,
// tin nhắn trợ lý, ghi chú, lượt chạy tool và settings cùng workspace — FE chỉ
// hiển thị, không tự tính số.
export const academyHomeApi = {
    // range: "7d" | "30d" | "all"
    get: ({ ownerId, workspaceId, range } = {}) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (workspaceId) params.set("workspaceId", workspaceId);
        if (range) params.set("range", range);
        const query = params.toString();
        return request(`/academy-home${query ? `?${query}` : ""}`);
    },
};
