export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export const API_ENDPOINTS = {
    DOCUMENTS: `${API_BASE_URL}/documents`,
    CHAT: `${API_BASE_URL}/chat`,
    AUTH: `${API_BASE_URL}/auth`,
    WORKSPACES: `${API_BASE_URL}/workspaces`,
    PROJECTS: `${API_BASE_URL}/projects`,
};
