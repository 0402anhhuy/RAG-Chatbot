import { request } from "./client";

// Agent template của một project (tab Agents)
export const agentApi = {
    list: (projectId, type) => {
        const params = new URLSearchParams();
        if (type) params.set("type", type);
        const query = params.toString();
        return request(`/projects/${projectId}/agents${query ? `?${query}` : ""}`);
    },

    getById: (projectId, agentId) => request(`/projects/${projectId}/agents/${agentId}`),

    create: (projectId, agent) =>
        request(`/projects/${projectId}/agents`, {
            method: "POST",
            body: JSON.stringify(agent),
        }),

    update: (projectId, agentId, changes) =>
        request(`/projects/${projectId}/agents/${agentId}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    remove: (projectId, agentId) =>
        request(`/projects/${projectId}/agents/${agentId}`, {
            method: "DELETE",
        }),
};
