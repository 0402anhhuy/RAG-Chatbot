import { buildQuery, request } from "@/api/client.js";

/**
 * Sinh mô tả task từ yêu cầu người dùng.
 *
 * BE HIỆN CHƯA CÓ endpoint này (TaskController không có route generate/assist).
 * Hàm throw lỗi rõ ràng thay vì bịa nội dung, và UI sẽ hiện thông báo trong
 * modal Description. Khi BE bổ sung (vd POST /tasks/description/generate trả
 * { description }), chỉ cần thay phần throw bằng `request(...)` bên dưới.
 */
export const generateTaskDescription = async ({ prompt /*, title, projectId */ }) => {
    if (!String(prompt || "").trim()) {
        throw new Error("Describe what the task should do first.");
    }

    // Khi có API:
    // const res = await request("/tasks/description/generate", {
    //     method: "POST",
    //     body: JSON.stringify({ prompt, title, projectId }),
    // });
    // return unwrap(res).description;
    throw new Error(
        "Description generation is not available yet: the backend has no generate endpoint.",
    );
};

export const taskApi = {
    list: ({ ownerId, projectId, status, archived, search } = {}) => {
        return request(`/tasks${buildQuery({
            ownerId: ownerId,
            projectId: projectId,
            status: status,
            archived: archived !== undefined && archived !== null ? String(archived) : undefined,
            search: search,
        })}`);
    },

    getById: (id) => request(`/tasks/${id}`),

    create: (task, ownerId) => {
        const query = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
        return request(`/tasks${query}`, {
            method: "POST",
            body: JSON.stringify(task),
        });
    },

    update: (id, changes) =>
        request(`/tasks/${id}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    archive: (id, archived = true) =>
        request(`/tasks/${id}/archive`, {
            method: "PATCH",
            body: JSON.stringify({ archived }),
        }),

    // Kéo-thả: đổi cột và đặt lại thứ tự trong cột
    move: (id, { status, sortKey, sortOrder, afterTaskId }) =>
        request(`/tasks/${id}/move`, {
            method: "PATCH",
            body: JSON.stringify({ status, sortKey, sortOrder, afterTaskId }),
        }),

    reorder: (projectId, status, taskIds) =>
        request(`/tasks/${projectId}/reorder`, {
            method: "PATCH",
            body: JSON.stringify({ status, taskIds }),
        }),

    remove: (id) =>
        request(`/tasks/${id}`, {
            method: "DELETE",
        }),
};
