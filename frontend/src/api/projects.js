import { request } from "./client";

export const projectApi = {
    list: ({ ownerId, status, search } = {}) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (status && status !== "All") params.set("status", status.toUpperCase());
        if (search) params.set("search", search);
        const query = params.toString();
        return request(`/projects${query ? `?${query}` : ""}`);
    },

    getById: (id) => request(`/projects/${id}`),

    create: (ownerId, project) =>
        request(`/projects?ownerId=${encodeURIComponent(ownerId)}`, {
            method: "POST",
            body: JSON.stringify(project),
        }),

    update: (id, changes) =>
        request(`/projects/${id}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    togglePinned: (id) =>
        request(`/projects/${id}/pin`, {
            method: "PATCH",
        }),

    remove: (id) =>
        request(`/projects/${id}`, {
            method: "DELETE",
        }),
};
