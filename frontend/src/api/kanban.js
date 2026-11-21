import { request } from "./client";

// Bảng Kanban của một project: 4 cột (kèm task) + danh sách member để filter/assign.
export const kanbanApi = {
    getBoard: (projectId) => request(`/projects/${projectId}/kanban`),
};
