import { request } from "@/api/client.js";

// Cấu hình cá nhân: hạn mức Starter Kit + API key các LLM provider.
export const userSettingsApi = {
    get: (userId) => request(`/users/${userId}/settings`),

    update: (userId, changes) =>
        request(`/users/${userId}/settings`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    connectProvider: (userId, provider, credentials) =>
        request(`/users/${userId}/settings/providers/${provider}`, {
            method: "PUT",
            body: JSON.stringify(credentials),
        }),

    disconnectProvider: (userId, provider) =>
        request(`/users/${userId}/settings/providers/${provider}`, {
            method: "DELETE",
        }),
};
