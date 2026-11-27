import { request } from "@/api/client.js";

export const userApi = {
    list: (ids) => {
        if (!ids || ids.length === 0) {
            return request("/users");
        }
        const params = new URLSearchParams();
        ids.forEach((id) => params.append("ids", id));
        return request(`/users?${params.toString()}`);
    },

    getById: (id) => request(`/users/${id}`),

    update: (id, changes) =>
        request(`/users/${id}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),
};
