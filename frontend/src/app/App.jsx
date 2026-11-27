import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useNavigate,
} from "react-router-dom";
import { useCallback } from "react";
import Layout from "@/components/layout/AppShell.jsx";
import Overview from "@/features/overview/Overview.jsx";
import Login from "@/features/auth/Login.jsx";
import Register from "@/features/auth/Register.jsx";
import DeveloperHub from "@/features/developer-hub/DeveloperHub.jsx";
import AcademyHub from "@/features/academy-hub/AcademyHub.jsx";
import AdminPage from "@/features/admin/AdminPage.jsx";
import LandingPage from "@/features/landing/LandingPage.jsx";
import TooltipLayer from "@/components/ui/TooltipLayer.jsx";
import { getSessionUser } from "@/lib/session";
import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive.js";

/** Chặn route admin: chỉ cho qua khi user đăng nhập có role ADMIN. */
function RequireAdmin({ children }) {
    const role = (getSessionUser().role || "").toUpperCase();
    if (role !== "ADMIN") {
        return <Navigate to="/overview" replace />;
    }
    return children;
}

/** Trang chủ: khách (chưa đăng nhập) xem landing page, đã đăng nhập vào thẳng Overview. */
function HomeGate() {
    return getSessionUser().id ? (
        <Navigate to="/overview" replace />
    ) : (
        <LandingPage />
    );
}

function App() {
    const navigate = useNavigate();

    // Giữ phiên sống liên tục: tự refresh token khi sắp hết hạn / khi quay lại tab.
    // Chỉ về /login khi refresh token cũng đã hết hạn thật.
    const handleSessionExpired = useCallback(() => {
        navigate("/login", { replace: true });
    }, [navigate]);
    useSessionKeepAlive({ onExpired: handleSessionExpired });

    return (
        <>
            <Routes>
                {/* 1. Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* 2. Overview Hub (Toàn màn hình, không bị sidebar của Layout bao quanh) */}
                <Route path="/overview" element={<Overview />} />

                {/* 3. Trang chủ: khách xem landing page, đã đăng nhập thì vào Overview */}
                <Route path="/" element={<HomeGate />} />
                <Route path="/landing" element={<HomeGate />} />

                <Route path="/developer-hub" element={<DeveloperHub />} />
                <Route path="/academy-hub" element={<AcademyHub />} />

                {/* 4. Không gian làm việc chi tiết (Có Sidebar của Layout) */}
                <Route element={<Layout />}>
                    {/* Khu vực quản trị — chỉ ADMIN nhìn thấy tab và vào được */}
                    <Route
                        path="admin"
                        element={
                            <RequireAdmin>
                                <AdminPage />
                            </RequireAdmin>
                        }
                    />
                </Route>

                {/* Fallback cho route không tồn tại */}
                <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>

            {/* Tooltip dùng chung: nâng cấp mọi `title` và `data-tooltip` */}
            <TooltipLayer />
        </>
    );
}

export default function AppRoot() {
    return (
        <Router>
            <App />
        </Router>
    );
}