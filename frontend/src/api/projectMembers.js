import { request } from "./client";

// Thành viên của một project (tab "Project Members")
export const projectMemberApi = {
    list: (projectId) => request(`/projects/${projectId}/members`),

    // Tài khoản có thể thêm vào project (BE đã loại những người đã là member)
    searchCandidates: (projectId, search) => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        const query = params.toString();
        return request(`/projects/${projectId}/members/candidates${query ? `?${query}` : ""}`);
    },

    add: (projectId, member) =>
        request(`/projects/${projectId}/members`, {
            method: "POST",
            body: JSON.stringify(member),
        }),

    updateRole: (projectId, memberId, role) =>
        request(`/projects/${projectId}/members/${memberId}`, {
            method: "PATCH",
            body: JSON.stringify({ role }),
        }),

    remove: (projectId, memberId) =>
        request(`/projects/${projectId}/members/${memberId}`, {
            method: "DELETE",
        }),
};
