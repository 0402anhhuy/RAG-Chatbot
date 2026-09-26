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
import "./App.css";

function App() {
    return (
        <Router>
            <Routes>
                {/* 1. Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* 2. Overview Hub (Toàn màn hình, không bị sidebar của Layout bao quanh) */}
                <Route path="/overview" element={<Overview />} />

                {/* 3. Trang chủ mặc định: Chuyển hướng về /overview */}
                <Route path="/" element={<Navigate to="/overview" replace />} />

                <Route path="/developer-hub" element={<DeveloperHub />} />
                <Route path="/academy-hub" element={<AcademyHub />} />

                {/* 4. Không gian làm việc chi tiết (Có Sidebar của Layout) */}
                <Route element={<Layout />}>
                    {/* <Route path="admin" element={<Dashboard />} />
                    <Route path="activity" element={<Activity />} />
                    <Route path="integrations" element={<Integrations />} />
                    <Route path="team" element={<Team />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="help" element={<Help />} /> */}
                </Route>

                {/* Fallback cho route không tồn tại */}
                <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
        </Router>
    );
}

export default App;