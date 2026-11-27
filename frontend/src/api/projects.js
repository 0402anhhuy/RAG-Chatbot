import { buildQuery, request } from "@/api/client.js";

export const projectApi = {
    list: ({ ownerId, status, search } = {}) => {
        return request(`/projects${buildQuery({
            ownerId: ownerId,
            status: status && status !== "All" ? status.toUpperCase() : undefined,
            search: search,
        })}`);
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
