import { API_BASE_URL } from "@/api/config.js";
import {
    clearSession,
    getSessionRefreshToken,
    getSessionToken,
    hasSession,
    updateSessionTokens,
} from "@/lib/session";

/** Gộp object thành query string, bỏ qua giá trị rỗng (undefined / null / ""). */
export function buildQuery(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        search.set(key, String(value));
    });
    const query = search.toString();
    return query ? `?${query}` : "";
}

/** Bóc ApiResponse envelope { success, message, data } -> data (idempotent). */
export function unwrap(response) {
    return response?.data ?? response;
}

/** Đường hứng khôi phục phiên: App sẽ chuyển hướng về /login khi refresh token hết hạn thật. */
export const SESSION_EXPIRED_EVENT = "rag:session-expired";

export class SessionExpiredError extends Error {
    constructor(message = "Session has expired. Please sign in again.") {
        super(message);
        this.name = "SessionExpiredError";
    }
}

function authHeaders(token = getSessionToken()) {
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const REFRESH_ENDPOINT = "/auth/refresh";

// Promise dùng chung: nhiều request 401 cùng lúc chỉ gọi refresh 1 lần.
let refreshInFlight = null;

function notifySessionExpired() {
    clearSession();
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
}

/**
 * Xin cặp access/refresh token mới. Trả về access token mới, hoặc null nếu
 * refresh token cũng đã hết hạn (lúc đó mới thực sự cần đăng nhập lại).
 */
export async function refreshSession() {
    if (refreshInFlight) return refreshInFlight;

    const refreshToken = getSessionRefreshToken();
    if (!refreshToken) return null;

    refreshInFlight = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}${REFRESH_ENDPOINT}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
            if (!response.ok) return null;
            const payload = await response.json().catch(() => ({}));
            const data = payload?.data ?? payload;
            const accessToken = data?.accessToken || data?.token;
            if (!accessToken) return null;
            updateSessionTokens({
                accessToken,
                refreshToken: data?.refreshToken || refreshToken,
            });
            return accessToken;
        } catch {
            // Lỗi mạng: giữ refresh token để lần sau thử lại, không đăng xuất.
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

async function readPayload(response) {
    if (response.status === 204) return null;
    return response.json().catch(() => ({}));
}

function throwHttpError(response, data) {
    const error = new Error(data?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
}

export async function request(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    // Endpoint auth công khai / refresh không cần (và không nên) thử refresh khi 401.
    const canRefresh = endpoint !== REFRESH_ENDPOINT && endpoint !== "/auth/login";

    const send = (token) => {
        // Không truyền token -> đọc lại token đang lưu (luôn mới nhất sau khi refresh).
        const headers = {
            ...(!isFormData && { "Content-Type": "application/json" }),
            ...(token ? authHeaders(token) : authHeaders()),
            ...options.headers,
        };
        if (isFormData) delete headers["Content-Type"];
        return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    };

    let response = await send();

    if (response.status === 401 && canRefresh) {
        const renewed = await refreshSession();
        if (renewed) {
            // Gửi lại request gốc với access token mới.
            response = await send(renewed);
        }
        if (response.status === 401) {
            notifySessionExpired();
            const data = await readPayload(response);
            throw new SessionExpiredError(
                data?.message || data?.error || "Session has expired. Please sign in again.",
            );
        }
    }

    if (response.status === 204) {
        return null;
    }

    const data = await readPayload(response);

    if (!response.ok) {
        throwHttpError(response, data);
    }

    return data;
}

export async function requestBlob(endpoint) {
    const send = (token) => fetch(`${API_BASE_URL}${endpoint}`, { headers: authHeaders(token) });

    let response = await send();

    if (response.status === 401) {
        const renewed = await refreshSession();
        if (renewed) response = await send(renewed);

        if (response.status === 401) {
            notifySessionExpired();
            throw new SessionExpiredError("Session has expired. Please sign in again.");
        }
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throwHttpError(response, data);
    }

    return response.blob();
}

/**
 * Khôi phục phiên ngay khi app mở lại (ví dụ sau khi máy ngủ / mở tab cũ):
 * nếu còn session mà access token đã hết hạn thì refresh luôn.
 */
export async function ensureFreshSession() {
    if (!hasSession()) return false;
    if (await refreshSession()) return true;
    // Không refresh được: chỉ đăng xuất khi refresh token chắc chắn không còn.
    if (!getSessionRefreshToken()) {
        notifySessionExpired();
        return false;
    }
    return true;
}
