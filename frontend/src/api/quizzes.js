import { request } from "./client";

// Đề kiểm tra của tab Quizzes. status / score / lastAttempt do BE suy ra từ các
// lượt làm của userId nên FE chỉ hiển thị.
export const quizApi = {
    list: ({ ownerId, workspaceId, userId, status, search } = {}) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (workspaceId) params.set("workspaceId", workspaceId);
        if (userId) params.set("userId", userId);
        if (status) params.set("status", status);
        if (search) params.set("search", search);
        const query = params.toString();
        return request(`/quizzes${query ? `?${query}` : ""}`);
    },

    // Số liệu thanh "Quick Metrics" đầu tab
    stats: ({ ownerId, workspaceId, userId } = {}) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (workspaceId) params.set("workspaceId", workspaceId);
        if (userId) params.set("userId", userId);
        const query = params.toString();
        return request(`/quizzes/stats${query ? `?${query}` : ""}`);
    },

    getById: (quizId, userId) => request(`/quizzes/${quizId}${userId ? `?userId=${userId}` : ""}`),

    create: (ownerId, quiz) =>
        request(`/quizzes${ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : ""}`, {
            method: "POST",
            body: JSON.stringify(quiz),
        }),

    update: (quizId, changes) =>
        request(`/quizzes/${quizId}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    remove: (quizId) =>
        request(`/quizzes/${quizId}`, {
            method: "DELETE",
        }),

    // "Start Full Assessment"
    startAttempt: (quizId, userId) =>
        request(`/quizzes/${quizId}/attempts?userId=${encodeURIComponent(userId)}`, {
            method: "POST",
        }),

    // Nộp bài: correctCount / questionCount để BE ghi điểm
    submitAttempt: (quizId, userId, payload) =>
        request(`/quizzes/${quizId}/attempts/submit?userId=${encodeURIComponent(userId)}`, {
            method: "POST",
            body: JSON.stringify(payload || {}),
        }),
};
