import { useEffect } from "react";
import {
    SESSION_EXPIRED_EVENT,
    ensureFreshSession,
    refreshSession,
} from "@/api/client.js";
import { getAccessTokenExpiryMs, hasSession } from "@/lib/session";

// Refresh sớm trước khi access token hết hạn (tránh request nào rơi vào 401).
const REFRESH_AHEAD_MS = 60 * 1000;
// Nhịp kiểm tra tối đa khi không có mốc hết hạn đọc được.
const FALLBACK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Giữ phiên đăng nhập sống liên tục:
 * - Tự refresh trước khi access token hết hạn (kể cả khi user không thao tác).
 * - Refresh ngay khi tab được focus lại / máy thức dậy sau khi ngủ (timers bị treo).
 * - Phát sự kiện SESSION_EXPIRED_EVENT để App đưa user về /login chỉ khi
 *   refresh token cũng đã hết hạn thật.
 */
export function useSessionKeepAlive({ onExpired } = {}) {
    useEffect(() => {
        if (!hasSession()) return undefined;

        let timeoutId = null;
        let cancelled = false;

        // Lấy access token mới, dùng chung logic chung với axios/fetch client.
        const refreshAgain = async () => {
            if (cancelled || !hasSession()) return;
            await refreshSession();
        };

        const schedule = () => {
            if (cancelled) return;
            if (timeoutId) clearTimeout(timeoutId);
            const expiresAt = getAccessTokenExpiryMs();
            const delay = expiresAt
                ? Math.max(expiresAt - Date.now() - REFRESH_AHEAD_MS, 1000)
                : FALLBACK_INTERVAL_MS;
            timeoutId = setTimeout(() => {
                // Khi tab đang ẩn, trình duyệt có thể bóp timer: chỉ refresh lúc
                // quay lại tab (listener bên dưới lo việc đó), tránh spam.
                if (
                    typeof document !== "undefined" &&
                    document.visibilityState === "hidden"
                ) {
                    schedule();
                    return;
                }
                void refreshAgain().finally(schedule);
            }, delay);
        };

        const handleWake = () => {
            if (cancelled || !hasSession()) return;
            if (
                typeof document !== "undefined" &&
                document.visibilityState === "hidden"
            )
                return;
            const expiresAt = getAccessTokenExpiryMs();
            const needsRefresh =
                !expiresAt || expiresAt - Date.now() < REFRESH_AHEAD_MS;
            if (needsRefresh) {
                void refreshAgain().finally(schedule);
            } else {
                schedule();
            }
        };

        const handleExpired = () => {
            if (typeof onExpired === "function") onExpired();
        };

        // Lần đầu mount: khôi phục phiên nếu đã hết hạn (app mở lại sau nhiều giờ).
        void ensureFreshSession().finally(schedule);

        const handleVisibility = () => {
            if (document.visibilityState === "visible") handleWake();
        };

        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleWake);
        window.addEventListener("online", handleWake);
        window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);

        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleWake);
            window.removeEventListener("online", handleWake);
            window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
        };
    }, [onExpired]);
}
