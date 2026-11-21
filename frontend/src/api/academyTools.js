import { request } from "./client";

// Công cụ học tập của tab Tools (Academy Hub). Catalog, tài liệu nguồn và kết quả
// chạy đều do BE trả từ dữ liệu thật — FE chỉ hiển thị.
export const academyToolApi = {
    // 4 card tool kèm số liệu (số nguồn đã index, số lượt chạy, lần chạy gần nhất)
    list: (userId) => request(`/users/${userId}/academy-tools`),

    // Tài liệu có thể chọn làm nguồn cho một tool
    context: (userId, toolId, workspaceId) => {
        const params = new URLSearchParams();
        if (workspaceId) params.set("workspaceId", workspaceId);
        const query = params.toString();
        return request(
            `/users/${userId}/academy-tools/${toolId}/context${query ? `?${query}` : ""}`,
        );
    },

    // Chạy tool: { documentIds, prompt, topic, difficulty, questionCount }
    run: (userId, toolId, payload = {}) =>
        request(`/users/${userId}/academy-tools/${toolId}/run`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    // Lượt chạy gần nhất (null khi chưa chạy lần nào)
    latest: (userId, toolId) => request(`/users/${userId}/academy-tools/${toolId}/latest`),
};
