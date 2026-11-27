import { buildQuery, request } from "@/api/client.js";
import { API_BASE_URL } from "@/api/config.js";

// Khóa học của Academy Hub. Tài liệu học tập nằm trong course.materials
// (BE lấy từ documents cùng workspace có courseCode trùng mã khóa học).
export const courseApi = {
    list: ({ ownerId, workspaceId, status, search } = {}) => {
        return request(`/courses${buildQuery({
            ownerId: ownerId,
            workspaceId: workspaceId,
            status: status,
            search: search,
        })}`);
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
