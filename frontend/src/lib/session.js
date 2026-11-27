const SESSION_KEY = "rag_session";
const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";

const EMPTY_USER = Object.freeze({});

/** Đọc toàn bộ phiên thô (đã parse) từ localStorage; {} nếu chưa đăng nhập / hỏng. */
const readRawSession = () => {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}") || {};
    } catch {
        return {};
    }
};

/**
 * Đọc phiên đăng nhập từ localStorage.
 * Tương thích cả 2 dạng lưu: { user: {...} } hoặc user object trực tiếp.
 * Luôn trả về user object ({} nếu chưa đăng nhập / dữ liệu hỏng) — không bịa user giả.
 */
export const getSessionUser = () => {
    const parsed = readRawSession();
    return parsed?.user || parsed || EMPTY_USER;
};

/** Trả về id của user hiện tại, hoặc null. */
export const getSessionUserId = () => getSessionUser()?.id || null;

/** Trả về token đăng nhập (null nếu chưa đăng nhập). */
export const getSessionToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

/** Trả về refresh token (null nếu phiên cũ chưa có refresh token). */
export const getSessionRefreshToken = () => {
    try {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
        return null;
    }
};

/** Lưu phiên đăng nhập + token sau khi login/register/refresh thành công. */
export const saveSession = (authData = {}) => {
    const token = authData.accessToken || authData.token;
    const refreshToken = authData.refreshToken;
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(authData));
        if (token) localStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
        /* localStorage bị chặn — bỏ qua, app vẫn chạy trong phiên hiện tại */
    }
};

/**
 * Chỉ cập nhật cặp token sau khi refresh, giữ nguyên user + các field khác của phiên.
 * (refresh token được xoay mỗi lần nên giá trị cũ sẽ hết hiệu lực)
 */
export const updateSessionTokens = ({ accessToken, refreshToken }) => {
    const current = readRawSession();
    const nextUser = current?.user || current || {};
    saveSession({
        ...current,
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        user: nextUser,
    });
};

/** Xoá phiên đăng nhập (session + token). */
export const clearSession = () => {
    try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
        /* ignore */
    }
};

/** Có phiên đăng nhập hay không (để biết khi nào cần redirect về /login). */
export const hasSession = () => Boolean(getSessionUserId() || getSessionToken());

/** Đọc mốc hết hạn (ms) của JWT trong localStorage mà không cần verify chữ ký. */
export const getAccessTokenExpiryMs = (token = getSessionToken()) => {
    if (!token) return null;
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        const claims = JSON.parse(atob(padded));
        return typeof claims.exp === "number" ? claims.exp * 1000 : null;
    } catch {
        return null;
    }
};
