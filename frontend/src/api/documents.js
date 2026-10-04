import { request } from "./client";
import { API_BASE_URL } from "./config";

export const documentApi = {
    getByWorkspace: (workspaceId, { courseCode, fileType, status } = {}) => {
        const params = new URLSearchParams({ workspaceId });
        if (courseCode && courseCode !== "all") params.append("courseCode", courseCode);
        if (fileType && fileType !== "all") params.append("fileType", fileType);
        if (status) params.append("status", status);

        return request(`/documents?${params.toString()}`);
    },

    getById: (id) => request(`/documents/${id}`),

    upload: (file, workspaceId, courseCode = "GEN") => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);
        formData.append("courseCode", courseCode);

        return request("/documents/upload", {
            method: "POST",
            body: formData,
        });
    },

    create: (workspaceId, documentData) =>
        request(`/documents?workspaceId=${workspaceId}`, {
            method: "POST",
            body: JSON.stringify(documentData),
        }),

    delete: (id) =>
        request(`/documents/${id}`, {
            method: "DELETE",
        }),

    getPreviewUrl: (id) => 
    `${API_BASE_URL}/documents/${id}/preview#scrollbar=0`,
    
    getDownloadUrl: (id) => `${API_BASE_URL}/documents/${id}/download`,
};
