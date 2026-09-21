import { request } from "./client";

export const documentApi = {
    getByWorkspace: (workspaceId, status) => {
        const query = status
            ? `?workspaceId=${workspaceId}&status=${status}`
            : `?workspaceId=${workspaceId}`;
        return request(`/documents${query}`);
    },

    getById: (id) => request(`/documents/${id}`),

    create: (workspaceId, documentData) =>
        request(`/documents?workspaceId=${workspaceId}`, {
            method: "POST",
            body: JSON.stringify(documentData),
        }),

    delete: (id) =>
        request(`/documents/${id}`, {
            method: "DELETE",
        }),
};
