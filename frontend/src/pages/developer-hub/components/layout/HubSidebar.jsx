import {
    Home,
    FolderKanban,
    MessageSquare,
    Box,
    CheckSquare,
    Settings,
    Menu,
    Search,
    Globe,
    Sun,
} from "lucide-react";
import "./HubSidebar.css";

const HUB_NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "sandboxes", label: "Sandboxes", icon: Box },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "settings", label: "Settings", icon: Settings },
];

const HubSidebar = ({
    activeTab = "home",
    onTabChange,
    session,
    isCollapsed = false,
    onToggleCollapse,
}) => {
    return (
        <aside className={`vibe-sidebar ${isCollapsed ? "collapsed-rail" : ""}`}>
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

            <nav className="sidebar-nav-list">
                {HUB_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                            onClick={() => onTabChange && onTabChange(item.id)}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon size={16} className="nav-glyph" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

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
                            <small>{session?.email || "huy@prismstudio.dev"}</small>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default HubSidebar;
