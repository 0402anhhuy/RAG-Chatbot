import { request, requestBlob } from "./client";

// Dữ liệu tab IDE của một project: cây file, editor, sync thư mục, transcript
// và cấu hình thanh prompt. Mọi số liệu đều lấy từ BE, không dùng mock.
export const workbenchApi = {
    listFiles: (projectId, { search, extension, tree = true } = {}) => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (extension) params.set("extension", extension);
        params.set("tree", String(tree));
        return request(`/projects/${projectId}/workbench/files?${params.toString()}`);
    },

    createFile: (projectId, payload) =>
        request(`/projects/${projectId}/workbench/files`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    getFile: (projectId, fileId) => request(`/projects/${projectId}/workbench/files/${fileId}`),

    saveFile: (projectId, fileId, changes) =>
        request(`/projects/${projectId}/workbench/files/${fileId}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    deleteFile: (projectId, fileId) =>
        request(`/projects/${projectId}/workbench/files/${fileId}`, {
            method: "DELETE",
        }),

    // Sync to folder: gửi toàn bộ file đang có trên máy lên workspace
    sync: (projectId, files) =>
        request(`/projects/${projectId}/workbench/sync`, {
            method: "POST",
            body: JSON.stringify(files),
        }),

    upload: (projectId, { path, content }) =>
        request(`/projects/${projectId}/workbench/upload`, {
            method: "POST",
            body: JSON.stringify({ path, content }),
        }),

    getSettings: (projectId, conversationId) => {
        const query = conversationId ? `?conversationId=${conversationId}` : "";
        return request(`/projects/${projectId}/workbench/settings${query}`);
    },

    updateSettings: (projectId, conversationId, changes) =>
        request(`/projects/${projectId}/workbench/settings?conversationId=${conversationId}`, {
            method: "PATCH",
            body: JSON.stringify(changes),
        }),

    downloadWorkspace: (projectId, filename = "workspace.md") =>
        requestBlob(`/projects/${projectId}/workbench/download?filename=${encodeURIComponent(filename)}`),

    downloadTranscript: (projectId, conversationId) =>
        requestBlob(`/projects/${projectId}/workbench/conversations/${conversationId}/transcript`),
};
