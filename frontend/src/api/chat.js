// src/api/chat.js
import { buildQuery, request } from "@/api/client.js";

export const chatApi = {
    createSession: (payload) =>
        request("/chat/sessions", {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    getSession: (id) => request(`/chat/sessions/${id}`),

    getSessionsByWorkspace: (workspaceId) => request(`/chat/sessions?workspaceId=${workspaceId}`),

    getSessionsByOwner: (ownerId) => request(`/chat/sessions?ownerId=${ownerId}`),

    /**
     * Danh sách conversation có phân trang + tìm kiếm + lọc trạng thái.
     * status: "ACTIVE" | "ARCHIVED" | "ALL"
     */
    listConversations: ({
        ownerId,
        status = "ACTIVE",
        search,
        projectId,
        page = 0,
        size = 50,
    } = {}) => {
        return request(`/chat/conversations${buildQuery({
            ownerId: ownerId,
            status: status,
            search: search,
            projectId: projectId,
            page: String(page),
            size: String(size),
        })}`);
    },

    updateSession: (id, changes) =>
        request(`/chat/sessions/${id}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    setArchived: (id, archived = true) =>
        request(`/chat/sessions/${id}/archive?archived=${archived}`, {
            method: "PATCH",
        }),

    toggleBookmark: (id) =>
        request(`/chat/sessions/${id}/bookmark`, {
            method: "PATCH",
        }),

    recordUsage: (id, usage) =>
        request(`/chat/sessions/${id}/usage`, {
            method: "POST",
            body: JSON.stringify(usage),
        }),

    getMessages: (sessionId) => request(`/chat/sessions/${sessionId}/messages`),

    sendMessage: (sessionId, messageData) =>
        request(`/chat/sessions/${sessionId}/messages`, {
            method: "POST",
            body: JSON.stringify(messageData),
        }),

    deleteSession: (id) =>
        request(`/chat/sessions/${id}`, {
            method: "DELETE",
        }),
};
