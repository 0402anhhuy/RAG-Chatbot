import { API_BASE_URL } from "./config";

export async function request(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const isFormData = options.body instanceof FormData;

    const headers = {
        ...(!isFormData && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    if (isFormData) {
        delete headers["Content-Type"];
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
}
