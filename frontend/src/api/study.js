import { request } from "./client";

// Notebook học tập của tab Conversations (Academy Hub). Mọi endpoint đều trả về
// đầy đủ StudyWorkspaceResponse để cập nhật cả 3 cột trong một lần.
export const studyApi = {
    // sessionId bỏ trống => BE chọn conversation mới nhất (tạo mới nếu chưa có)
    getWorkspace: ({ ownerId, workspaceId, sessionId } = {}) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (workspaceId) params.set("workspaceId", workspaceId);
        if (sessionId) params.set("sessionId", sessionId);
        const query = params.toString();
        return request(`/study${query ? `?${query}` : ""}`);
    },

    // Upload file vào workspace của notebook (courseCode = NOTEBOOK để tách khỏi
    // tài liệu khóa học), rồi gắn document vừa tạo làm nguồn.
    uploadSource: (file, workspaceId) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);
        formData.append("courseCode", "NOTEBOOK");
        return request("/documents/upload", { method: "POST", body: formData });
    },

    addSource: (sessionId, source) =>
        request(`/study/sessions/${sessionId}/sources`, {
            method: "POST",
            body: JSON.stringify(source),
        }),

    removeSource: (sessionId, attachmentId) =>
        request(`/study/sessions/${sessionId}/sources/${attachmentId}`, {
            method: "DELETE",
        }),

    setSourceChecked: (sessionId, attachmentId, checked) =>
        request(`/study/sessions/${sessionId}/sources/${attachmentId}?checked=${checked}`, {
            method: "PATCH",
        }),

    // "Chọn tất cả"
    setAllSourcesChecked: (sessionId, checked) =>
        request(`/study/sessions/${sessionId}/sources/select-all?checked=${checked}`, {
            method: "PATCH",
        }),

    sendMessage: (sessionId, message) =>
        request(`/study/sessions/${sessionId}/messages`, {
            method: "POST",
            body: JSON.stringify({ message }),
        }),

    runStudioTool: (sessionId, tool) =>
        request(`/study/sessions/${sessionId}/studio`, {
            method: "POST",
            body: JSON.stringify({ tool }),
        }),

    addNote: (ownerId, sessionId, note) => {
        const params = new URLSearchParams();
        if (ownerId) params.set("ownerId", ownerId);
        if (sessionId) params.set("sessionId", sessionId);
        const query = params.toString();
        return request(`/study/notes${query ? `?${query}` : ""}`, {
            method: "POST",
            body: JSON.stringify(note),
        });
    },

    deleteNote: (sessionId, noteId) =>
        request(`/study/sessions/${sessionId}/notes/${noteId}`, {
            method: "DELETE",
        }),
};
