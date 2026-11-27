import { buildQuery, request } from "@/api/client.js";

// Agent template của một project (tab Agents)
export const agentApi = {
    list: (projectId, type) => {
        return request(`/projects/${projectId}/agents${buildQuery({
            type: type,
        })}`);
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
