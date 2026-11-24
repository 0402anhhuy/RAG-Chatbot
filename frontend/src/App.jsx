import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/overview/Overview";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import DeveloperHub from "./pages/developer-hub/DeveloperHub";
import AcademyHub from "./pages/academy-hub/AcademyHub";
import AdminPage from "./pages/admin/AdminPage";
import LandingPage from "./pages/landing/LandingPage";
import { getSessionUser } from "./components/common/utils/session";
import "./App.css";

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
    return (
        <Router>
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
        </Router>
    );
}

export default App;