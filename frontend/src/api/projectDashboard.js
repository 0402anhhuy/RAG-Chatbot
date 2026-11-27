import { request } from "@/api/client.js";

// KPI + My Tasks cho tab Dashboard của project.
// viewerId dùng để biết task nào đang giao cho người đang xem.
export const projectDashboardApi = {
    get: (projectId, viewerId) => {
        const query = viewerId ? `?viewerId=${viewerId}` : "";
        return request(`/projects/${projectId}/dashboard${query}`);
    },
};
