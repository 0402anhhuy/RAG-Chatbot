import {
    Activity,
    MessageSquare,
    GitCommit,
    Workflow,
    Orbit,
    Globe,
    Menu,
    Search,
    Sun,
    ChevronDown,
} from "lucide-react";
import "./WorkbenchSidebar.css";

const WORKBENCH_NAV_ITEMS = [
    { id: "ide", label: "IDE", icon: Activity },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "changes", label: "Changes", icon: GitCommit },
    { id: "canvas", label: "Canvas", icon: Workflow },
    { id: "galaxy", label: "Galaxy", icon: Orbit },
    { id: "preview", label: "Preview", icon: Globe },
];

const WorkbenchSidebar = ({
    activeWorkbenchTab = "ide",
    onTabChange,
    isCollapsed = false,
    onToggleCollapse,
    session,
}) => {
    return (
        <aside className={`workbench-sidebar ${isCollapsed ? "collapsed-rail" : ""}`}>
            {/* Toggle Menu */}
            <div className="wb-sidebar-brand-line">
                <button
                    type="button"
                    className="btn-wb-toggle-menu"
                    onClick={onToggleCollapse}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <Menu size={16} />
                    {!isCollapsed && <span>MENU</span>}
                </button>
            </div>

            {/* Quick Search */}
            {!isCollapsed ? (
                <button type="button" className="wb-sidebar-search-pill">
                    <Search size={14} />
                    <span>Search</span>
                    <kbd>Ctrl+K</kbd>
                </button>
            ) : (
                <button type="button" className="wb-sidebar-search-mini" title="Search (Ctrl+K)">
                    <Search size={15} />
                </button>
            )}

            {/* Navigation List */}
            <nav className="wb-sidebar-nav-list">
                {WORKBENCH_NAV_ITEMS.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeWorkbenchTab === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={`wb-sidebar-nav-item ${isActive ? "active" : ""}`}
                            onClick={() => onTabChange(item.id)}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <IconComponent size={16} className="wb-nav-glyph" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="wb-sidebar-footer-cluster">
                {!isCollapsed && (
                    <>
                        <button type="button" className="wb-footer-action-row">
                            <Globe size={14} />
                            <span>English</span>
                        </button>
                        <button type="button" className="wb-footer-action-row">
                            <Sun size={14} />
                            <span>Theme</span>
                        </button>
                    </>
                )}

                <div className="wb-sidebar-profile-card">
                    <div className="wb-user-initials-chip">
                        {(session?.name || "HT").slice(0, 2).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="wb-user-text-info">
                            <strong>{session?.name || "Huy Tran Anh"}</strong>
                            <small>v1.0.0-rc-50-min</small>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default WorkbenchSidebar;
