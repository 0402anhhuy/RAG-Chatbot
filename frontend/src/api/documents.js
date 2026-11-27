import { buildQuery, request, requestBlob } from "@/api/client.js";

export const documentApi = {
    getByWorkspace: (workspaceId, { courseCode, fileType, status } = {}) => {
        return request(`/documents${buildQuery({
            workspaceId: workspaceId,
            courseCode: courseCode && courseCode !== "all" ? courseCode : undefined,
            fileType: fileType && fileType !== "all" ? fileType : undefined,
            status: status,
        })}`);
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

    getPreview: (id) => requestBlob(`/documents/${id}/preview`),

    getDownload: (id) => requestBlob(`/documents/${id}/download`),
};
