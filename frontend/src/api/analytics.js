import { request } from "@/api/client.js";

// Số liệu Analytics của project, tính từ các lượt dùng LLM đã ghi nhận ở BE.
// month dạng "yyyy-MM"; bỏ trống thì BE trả tháng hiện tại.
export const analyticsApi = {
    getByProject: (projectId, month) => {
        const query = month ? `?month=${encodeURIComponent(month)}` : "";
        return request(`/projects/${projectId}/analytics${query}`);
    },

    recordUsage: (projectId, payload) =>
        request(`/projects/${projectId}/analytics/usage`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    // Đơn giá token theo provider/model — dùng để đối chiếu ra tiền.
    listPrices: (provider) => {
        const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
        return request(`/analytics/prices${query}`);
    },

    upsertPrice: (provider, payload) =>
        request(`/analytics/prices/${provider}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        }),
};
