import { buildQuery, request } from "@/api/client.js";

// Đề kiểm tra của tab Quizzes. status / score / lastAttempt do BE suy ra từ các
// lượt làm của userId nên FE chỉ hiển thị.
export const quizApi = {
    list: ({ ownerId, workspaceId, userId, status, search } = {}) => {
        return request(`/quizzes${buildQuery({
            ownerId: ownerId,
            workspaceId: workspaceId,
            userId: userId,
            status: status,
            search: search,
        })}`);
    },

    // Số liệu thanh "Quick Metrics" đầu tab
    stats: ({ ownerId, workspaceId, userId } = {}) => {
        return request(`/quizzes/stats${buildQuery({
            ownerId: ownerId,
            workspaceId: workspaceId,
            userId: userId,
        })}`);
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
