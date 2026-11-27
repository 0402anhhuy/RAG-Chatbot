import { buildQuery, request, unwrap } from "@/api/client.js";

export const adminApi = {
    /** Tổng quan nền tảng (days = 7 | 30 | 90) */
    getDashboard: (days = 30) =>
        request(`/admin/dashboard${buildQuery({ days })}`).then(unwrap),

    /** Tìm kiếm + phân trang danh sách user */
    getUsers: ({ search, role, active, page = 0, size = 10 } = {}) =>
        request(
            `/admin/users${buildQuery({ search, role, active, page, size })}`,
        ).then(unwrap),

    setUserRole: (userId, role) =>
        request(`/admin/users/${userId}/role${buildQuery({ role })}`, {
            method: "PATCH",
        }).then(unwrap),

    setUserStatus: (userId, active) =>
        request(`/admin/users/${userId}/status${buildQuery({ active })}`, {
            method: "PATCH",
        }).then(unwrap),
};
