const STORAGE_KEY = "rag_session";

/**
 * Đọc phiên đăng nhập từ localStorage.
 * Tương thích cả 2 dạng lưu: { user: {...} } hoặc user object trực tiếp.
 * Luôn trả về object ({} nếu chưa đăng nhập / dữ liệu hỏng).
 */
export const getSessionUser = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return parsed?.user || parsed || {};
    } catch {
        return {};
    }
};

/** Trả về id của user hiện tại, hoặc null. */
export const getSessionUserId = () => {
    return getSessionUser()?.id || null;
};

/** Xoá phiên đăng nhập (session + token). */
export const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("token");
};
