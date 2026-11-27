import { useMemo } from "react";
import { getSessionToken, getSessionUser } from "@/lib/session";

/**
 * Phiên đăng nhập hiện tại, đọc một lần mỗi lần render component.
 * Trả về cả user object và các field hay dùng để khỏi phải tự parse localStorage.
 */
export function useSession() {
    return useMemo(() => {
        const user = getSessionUser();
        return {
            user,
            userId: user?.id || null,
            name: user?.name || "",
            email: user?.email || "",
            role: (user?.role || "").toUpperCase(),
            isAuthenticated: Boolean(user?.id),
            isAdmin: (user?.role || "").toUpperCase() === "ADMIN",
            token: getSessionToken(),
        };
    }, []);
}
