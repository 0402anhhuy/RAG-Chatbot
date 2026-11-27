import { request } from "@/api/client.js";

export const workspaceApi = {
    list: () => request("/workspaces"),
    create: (payload) =>
        request("/workspaces", {
            method: "POST",
            body: JSON.stringify(payload),
        }),
    getById: (id) => request(`/workspaces/${id}`),
};
