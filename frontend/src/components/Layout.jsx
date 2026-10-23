import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
    Activity,
    BookOpen,
    Code2,
    Compass,
    FileText,
    HelpCircle,
    LayoutDashboard,
    LogOut,
    MessageSquare,
    PenTool,
    Settings,
    Users,
    Zap,
} from "lucide-react";
import "./Layout.css";

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);

    const sidebarRef = useRef(null);

    const session = JSON.parse(
        localStorage.getItem("rag_session") ||
            '{"role":"user","name":"Huy Tran","email":"huy@ragstudio.dev"}',
    );
    const isAdmin = session.role === "admin" || session.role === "ADMIN";
    const isWorkspaceToolRoute =
        (location.pathname === "/chat" ||
            location.pathname === "/canvas" ||
            location.pathname === "/documents") &&
        !isAdmin;

    const handleLogout = () => {
        localStorage.removeItem("rag_session");
        localStorage.removeItem("token");
        navigate("/login");
    };

    useEffect(() => {
        if (!sidebarRef.current) return;
        sidebarRef.current.style.width = isExpanded ? "244px" : "64px";
    }, [isExpanded]);

    return (
        <div className="app-shell">
            <div className={`shell-layout ${isWorkspaceToolRoute ? "compact-mode" : ""}`}>
                <aside
                    ref={sidebarRef}
                    className={`global-sidebar ${isExpanded ? "expanded" : "collapsed"}`}
                >
                    <button
                        type="button"
                        className="sidebar-brand-btn"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        title={isExpanded ? "Collapse sidebar (Cmd+B)" : "Expand sidebar (Cmd+B)"}
                    >
                        <div className="brand-stripe-mark">
                            <span className="stripe-amber" />
                            <span className="stripe-blue" />
                            <span className="stripe-emerald" />
                        </div>
                        <div className="brand-title-wrap sidebar-expand-target">
                            <span className="brand-title">DevHub</span>
                            <span className="brand-subtitle">AI Developer Workspace</span>
                        </div>
                    </button>

                    <div className="sidebar-nav-container">
                        {isAdmin ? (
                            <>
                                <div className="nav-section-block">
                                    <span className="nav-section-label sidebar-expand-target">
                                        PLATFORM
                                    </span>
                                    <NavLink to="/admin" className="sidebar-link" title="Dashboard">
                                        <LayoutDashboard size={18} />
                                        <span className="sidebar-expand-target">Dashboard</span>
                                    </NavLink>
                                    <NavLink
                                        to="/activity"
                                        className="sidebar-link"
                                        title="Activity"
                                    >
                                        <Activity size={18} />
                                        <span className="sidebar-expand-target">Activity</span>
                                    </NavLink>
                                    <NavLink
                                        to="/integrations"
                                        className="sidebar-link"
                                        title="Integrations"
                                    >
                                        <Zap size={18} />
                                        <span className="sidebar-expand-target">Integrations</span>
                                    </NavLink>
                                </div>
                                <div className="nav-section-block">
                                    <span className="nav-section-label sidebar-expand-target">
                                        MANAGEMENT
                                    </span>
                                    <NavLink to="/team" className="sidebar-link" title="Team">
                                        <Users size={18} />
                                        <span className="sidebar-expand-target">Team Members</span>
                                    </NavLink>
                                    <NavLink
                                        to="/settings"
                                        className="sidebar-link"
                                        title="Settings"
                                    >
                                        <Settings size={18} />
                                        <span className="sidebar-expand-target">Organization</span>
                                    </NavLink>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="nav-section-block">
                                    <span className="nav-section-label sidebar-expand-target">
                                        STUDIO SUITE
                                    </span>
                                    <NavLink
                                        to="/chat"
                                        className="sidebar-link"
                                        title="AI Workspace Hub"
                                    >
                                        <Compass size={18} />
                                        <span className="sidebar-expand-target">Workspace Hub</span>
                                    </NavLink>
                                    <NavLink
                                        to="/canvas"
                                        className="sidebar-link"
                                        title="AI Architecture Canvas"
                                    >
                                        <PenTool size={18} />
                                        <span className="sidebar-expand-target">
                                            Architecture Canvas
                                        </span>
                                    </NavLink>
                                    <NavLink
                                        to="/documents"
                                        className="sidebar-link"
                                        title="Knowledge Base"
                                    >
                                        <FileText size={18} />
                                        <span className="sidebar-expand-target">
                                            Knowledge Base
                                        </span>
                                    </NavLink>
                                </div>
                                <div className="nav-section-block">
                                    <span className="nav-section-label sidebar-expand-target">
                                        WORKSPACE
                                    </span>
                                    <NavLink
                                        to="/settings"
                                        className="sidebar-link"
                                        title="Preferences"
                                    >
                                        <Settings size={18} />
                                        <span className="sidebar-expand-target">Preferences</span>
                                    </NavLink>
                                    <NavLink
                                        to="/help"
                                        className="sidebar-link"
                                        title="Documentation & Guides"
                                    >
                                        <HelpCircle size={18} />
                                        <span className="sidebar-expand-target">Documentation</span>
                                    </NavLink>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="sidebar-user-footer">
                        <div className="user-profile-badge">
                            <div className="user-avatar-initials">
                                {(session.name || "HU").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="user-metadata sidebar-expand-target">
                                <span className="user-display-name">
                                    {session.name || "Huy Tran"}
                                </span>
                                <span className="user-display-email">
                                    {session.email || "huy@ragstudio.dev"}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="sidebar-logout-btn sidebar-expand-target"
                                onClick={handleLogout}
                                title="Sign out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </aside>

                <main className="content-viewport">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
