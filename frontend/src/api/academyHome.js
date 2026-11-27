import { buildQuery, request } from "@/api/client.js";

// Dashboard tab Home (Academy Hub). BE tổng hợp từ courses, quizzes/attempts,
// tin nhắn trợ lý, ghi chú, lượt chạy tool và settings cùng workspace — FE chỉ
// hiển thị, không tự tính số.
export const academyHomeApi = {
    // range: "7d" | "30d" | "all"
    get: ({ ownerId, workspaceId, range } = {}) => {
        return request(`/academy-home${buildQuery({
            ownerId: ownerId,
            workspaceId: workspaceId,
            range: range,
        })}`);
    },
};
