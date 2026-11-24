import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { RefreshCw, Shield, LayoutDashboard, Users } from "lucide-react";
import { adminApi } from "../../api";
import { getSessionUser } from "../../components/common/utils/session";
import AdminOverview from "./AdminOverview";
import AdminUsers from "./AdminUsers";
import "./admin.css";

const RANGES = [
    { value: 7, label: "7 days" },
    { value: 30, label: "30 days" },
    { value: 90, label: "90 days" },
];

const TABS = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "users", label: "Users", icon: Users },
];

const AdminPage = () => {
    const role = (getSessionUser().role || "").toUpperCase();
    const [tab, setTab] = useState("overview");
    const [range, setRange] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = async (days = range) => {
        setLoading(true);
        setError("");
        try {
            const res = await adminApi.getDashboard(days);
            setData(res);
        } catch (err) {
            setError(err.message || "Failed to load platform data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRange = (days) => {
        setRange(days);
        loadDashboard(days);
    };

    if (role !== "ADMIN") {
        return <Navigate to="/overview" replace />;
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div className="admin-header-copy">
                    <span className="admin-eyebrow">
                        <Shield size={12} /> Admin Console
                    </span>
                    <h1 className="admin-title">Platform overview</h1>
                    <p className="admin-subtitle">
                        Health of Prism Studio — people, content and AI activity.
                    </p>
                </div>
                <div className="admin-header-actions">
                    <div className="admin-range-switch" role="tablist" aria-label="Time range">
                        {RANGES.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                className={`admin-range-btn ${range === r.value ? "active" : ""}`}
                                onClick={() => handleRange(r.value)}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="btn btn-secondary admin-refresh-btn"
                        onClick={() => loadDashboard()}
                        disabled={loading}
                        title="Refresh data"
                    >
                        <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
                    </button>
                </div>
            </header>

            <nav className="admin-tabs" role="tablist" aria-label="Admin sections">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.key}
                            className={`admin-tab ${tab === t.key ? "active" : ""}`}
                            onClick={() => setTab(t.key)}
                        >
                            <Icon size={14} /> {t.label}
                        </button>
                    );
                })}
            </nav>

            {error && (
                <div className="admin-error">
                    {error}
                    <button type="button" onClick={() => loadDashboard()}>
                        Try again
                    </button>
                </div>
            )}

            <div className="admin-tab-panels">
                {tab === "overview" && (
                    <AdminOverview data={data} loading={loading} onRetry={() => loadDashboard()} />
                )}
                {tab === "users" && <AdminUsers />}
            </div>
        </div>
    );
};

export default AdminPage;
