// src/api/chat.js
import { request } from "./client";

export const chatApi = {
    createSession: (payload) =>
        request("/chat/sessions", {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    getSession: (id) => request(`/chat/sessions/${id}`),

    getSessionsByWorkspace: (workspaceId) =>
        request(`/chat/sessions?workspaceId=${workspaceId}`),

    getSessionsByOwner: (ownerId) =>
        request(`/chat/sessions?ownerId=${ownerId}`),

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
