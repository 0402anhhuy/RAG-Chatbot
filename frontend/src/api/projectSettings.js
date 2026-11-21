import { request } from "./client";

// Tab Settings của một project: thông tin chung, LLM provider + budget và
// danh sách task đã archive. Toàn bộ số liệu do BE trả về.
export const projectSettingApi = {
    get: (projectId) => request(`/projects/${projectId}/settings`),

    // Gửi đúng field vừa đổi; null/di vắng nghĩa là giữ nguyên.
    update: (projectId, changes) =>
        request(`/projects/${projectId}/settings`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    // "Add & Verify": lưu key cho provider, trả về settings mới
    addProvider: (projectId, provider) =>
        request(`/projects/${projectId}/settings/providers`, {
            method: "POST",
            body: JSON.stringify(provider),
        }),

    removeProvider: (projectId, credentialId) =>
        request(`/projects/${projectId}/settings/providers/${credentialId}`, {
            method: "DELETE",
        }),

    listArchivedTasks: (projectId) => request(`/projects/${projectId}/settings/archived-tasks`),

    unarchiveTask: (projectId, taskId) =>
        request(`/projects/${projectId}/settings/archived-tasks/${taskId}/restore`, {
            method: "POST",
        }),
};
