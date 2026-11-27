import { buildQuery, request } from "@/api/client.js";

// Workflow template của một project (tab Workflows)
export const workflowApi = {
    list: (projectId, type) => {
        return request(`/projects/${projectId}/workflows${buildQuery({
            type: type,
        })}`);
    },

    getById: (projectId, workflowId) => request(`/projects/${projectId}/workflows/${workflowId}`),

    create: (projectId, workflow) =>
        request(`/projects/${projectId}/workflows`, {
            method: "POST",
            body: JSON.stringify(workflow),
        }),

    update: (projectId, workflowId, changes) =>
        request(`/projects/${projectId}/workflows/${workflowId}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    remove: (projectId, workflowId) =>
        request(`/projects/${projectId}/workflows/${workflowId}`, {
            method: "DELETE",
        }),
};
