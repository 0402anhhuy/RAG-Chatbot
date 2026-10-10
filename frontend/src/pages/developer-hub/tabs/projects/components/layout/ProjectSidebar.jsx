import {
    LayoutDashboard,
    Terminal,
    Columns3,
    Users,
    Workflow,
    Bot,
    BarChart3,
    GitPullRequest,
    Settings,
    Menu,
    Search,
    Globe,
    Sun,
} from "lucide-react";
import "./ProjectSidebar.css";

const PROJECT_NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "workbench", label: "Workbench", icon: Terminal },
    { id: "kanban", label: "Kanban", icon: Columns3 },
    { id: "members", label: "Members", icon: Users },
    { id: "workflows", label: "Workflows", icon: Workflow },
    { id: "agents", label: "Agents", icon: Bot },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "jira", label: "Jira", icon: GitPullRequest },
    { id: "settings", label: "Settings", icon: Settings },
];

const ProjectSidebar = ({
    activeProjectTab = "dashboard",
    onTabChange,
    isCollapsed = false,
    onToggleCollapse,
    session,
}) => {
    return (
        <aside className={`project-sidebar ${isCollapsed ? "collapsed-rail" : ""}`}>
            {/* Toggle Menu */}
            <div className="sidebar-brand-line">
                <button
                    type="button"
                    className="btn-toggle-menu"
                    onClick={onToggleCollapse}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <Menu size={16} />
                    {!isCollapsed && <span>MENU</span>}
                </button>
            </div>

            {/* Quick Search */}
            {!isCollapsed ? (
                <button type="button" className="sidebar-search-pill" onClick={() => {}}>
                    <Search size={14} />
                    <span>Search</span>
                    <kbd>Ctrl+K</kbd>
                </button>
            ) : (
                <button type="button" className="sidebar-search-mini" title="Search (Ctrl+K)">
                    <Search size={15} />
                </button>
            )}

            {/* Menu điều hướng con trong Project */}
            <nav className="sidebar-nav-list">
                {PROJECT_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeProjectTab === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                            onClick={() => onTabChange(item.id)}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon size={16} className="nav-glyph" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Footer Group */}
            <div className="sidebar-footer-cluster">
                {!isCollapsed && (
                    <>
                        <button type="button" className="footer-action-row">
                            <Globe size={14} />
                            <span>English</span>
                        </button>
                        <button type="button" className="footer-action-row">
                            <Sun size={14} />
                            <span>Theme</span>
                        </button>
                    </>
                )}

                <div className="sidebar-profile-card">
                    <div className="user-initials-chip">
                        {(session?.name || "HT").slice(0, 2).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="user-text-info">
                            <strong>{session?.name || "Huy Tran Anh"}</strong>
                            <small>v1.0.0-rc-50-min</small>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default ProjectSidebar;
