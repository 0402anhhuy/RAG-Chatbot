import { request } from "./client";

export const taskApi = {
    list: ({ ownerId, projectId, status, archived, search } = {}) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (projectId) params.set("projectId", projectId);
        if (status) params.set("status", status);
        if (archived !== undefined && archived !== null) params.set("archived", String(archived));
        if (search) params.set("search", search);
        const query = params.toString();
        return request(`/tasks${query ? `?${query}` : ""}`);
    },

    getById: (id) => request(`/tasks/${id}`),

    create: (task, ownerId) => {
        const query = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
        return request(`/tasks${query}`, {
            method: "POST",
            body: JSON.stringify(task),
        });
    },

    update: (id, changes) =>
        request(`/tasks/${id}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    archive: (id, archived = true) =>
        request(`/tasks/${id}/archive`, {
            method: "PATCH",
            body: JSON.stringify({ archived }),
        }),

    // Kéo-thả: đổi cột và đặt lại thứ tự trong cột
    move: (id, { status, sortKey, sortOrder, afterTaskId }) =>
        request(`/tasks/${id}/move`, {
            method: "PATCH",
            body: JSON.stringify({ status, sortKey, sortOrder, afterTaskId }),
        }),

    reorder: (projectId, status, taskIds) =>
        request(`/tasks/${projectId}/reorder`, {
            method: "PATCH",
            body: JSON.stringify({ status, taskIds }),
        }),

    remove: (id) =>
        request(`/tasks/${id}`, {
            method: "DELETE",
        }),
};
