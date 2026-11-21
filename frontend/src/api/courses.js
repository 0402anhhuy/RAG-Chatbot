import { request } from "./client";
import { API_BASE_URL } from "./config";

// Khóa học của Academy Hub. Tài liệu học tập nằm trong course.materials
// (BE lấy từ documents cùng workspace có courseCode trùng mã khóa học).
export const courseApi = {
    list: ({ ownerId, workspaceId, status, search } = {}) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (workspaceId) params.set("workspaceId", workspaceId);
        if (status) params.set("status", status);
        if (search) params.set("search", search);
        const query = params.toString();
        return request(`/courses${query ? `?${query}` : ""}`);
    },

    getById: (courseId) => request(`/courses/${courseId}`),

    // "Join Course"
    join: (ownerId, course) =>
        request(`/courses${ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : ""}`, {
            method: "POST",
            body: JSON.stringify(course),
        }),

    update: (courseId, changes) =>
        request(`/courses/${courseId}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    remove: (courseId) =>
        request(`/courses/${courseId}`, {
            method: "DELETE",
        }),

    // Bỏ khóa khỏi danh sách nhưng giữ tài liệu đã upload
    leave: (courseId) =>
        request(`/courses/${courseId}/leave`, {
            method: "POST",
        }),

    // Upload tài liệu vào khóa học: dùng chung endpoint documents với courseCode
    uploadMaterial: (file, workspaceId, courseCode) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);
        formData.append("courseCode", courseCode);
        return request("/documents/upload", { method: "POST", body: formData });
    },

    getMaterialDownloadUrl: (documentId) => `${API_BASE_URL}/documents/${documentId}/download`,
};
