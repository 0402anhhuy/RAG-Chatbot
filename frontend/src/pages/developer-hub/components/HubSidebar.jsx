import { useState } from "react";
import {
    BookOpen,
    CheckSquare,
    ChevronDown,
    Code2,
    FolderKanban,
    Globe,
    Home,
    MessageSquare,
    Moon,
    PenTool,
    Search,
    Settings,
    Terminal,
    Wrench,
} from "lucide-react";
import BrandLogo from "../../../components/common/logo/BrandLogo";
import "./HubSidebar.css";

const TOOLS_SUB_ITEMS = [
    { id: "code_review", label: "Source Code Review", icon: Code2 },
    { id: "canvas", label: "Architecture Canvas", icon: PenTool },
    { id: "knowledge", label: "Knowledge Assistant", icon: BookOpen },
    { id: "sandbox_runner", label: "Isolated Code Sandbox", icon: Terminal },
];

const NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "tools", label: "Tools", icon: Wrench, isToolParent: true },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "sandboxes", label: "Sandboxes", icon: Terminal },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "settings", label: "Settings", icon: Settings },
];

const HubSidebar = ({
    activeTab,
    onTabChange,
    session,
    isCollapsed = false,
    onToggleCollapse,
    activeSubTool = null,
    onSelectSubTool,
}) => {
    const [isToolsSubmenuOpen, setIsToolsSubmenuOpen] = useState(true);

    const handleItemClick = (item) => {
        if (item.isToolParent) {
            onTabChange("tools");
            
            // NẾU ĐANG Ở TRONG 1 TOOL:
            if (activeSubTool) {
                if (isCollapsed) {
                    // Nếu đang thu nhỏ -> Tự động mở rộng sidebar và mở luôn dropdown menu con
                    onToggleCollapse && onToggleCollapse();
                    setIsToolsSubmenuOpen(true);
                } else {
                    // Nếu đã mở rộng sẵn -> Cho phép bật/tắt đóng mở menu con
                    setIsToolsSubmenuOpen((prev) => !prev);
                }
            }
        } else {
            onTabChange(item.id);
        }
    };

    return (
        <aside className={`vibe-sidebar ${isCollapsed ? "collapsed-rail" : ""}`}>
            {/* BRAND LOGO ĐÓNG VAI TRÒ NÚT TOGGLE THU NHỎ / MỞ RỘNG */}
            <div
                className="sidebar-brand-header clickable-brand-toggle"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
            >
                <BrandLogo size="md" showText={!isCollapsed} title="Prism Studio" />
                {!isCollapsed && <span className="sidebar-hub-tag">DEV</span>}
            </div>

            {/* Search Input Button */}
            {!isCollapsed ? (
                <button
                    type="button"
                    className="sidebar-search-btn"
                    onClick={() => onTabChange("projects")}
                >
                    <Search size={14} />
                    <span>Search</span>
                    <kbd>Ctrl+K</kbd>
                </button>
            ) : (
                <button
                    type="button"
                    className="sidebar-search-btn-mini"
                    onClick={() => onTabChange("projects")}
                    title="Search (Ctrl+K)"
                >
                    <Search size={15} />
                </button>
            )}

            {/* Navigation Menus */}
            <nav className="sidebar-nav-menu">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isToolItem = item.isToolParent;
                    const showDropdown = !isCollapsed && isToolItem && Boolean(activeSubTool);

                    return (
                        <div key={item.id} className="nav-item-wrapper">
                            <button
                                type="button"
                                className={`nav-menu-item ${isActive ? "active" : ""}`}
                                onClick={() => handleItemClick(item)}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon size={16} />
                                {!isCollapsed && <span>{item.label}</span>}

                                {showDropdown && (
                                    <ChevronDown
                                        size={13}
                                        className={`tool-sub-arrow ${isToolsSubmenuOpen ? "open" : ""}`}
                                    />
                                )}
                            </button>

                            {showDropdown && isToolsSubmenuOpen && (
                                <div className="tools-sub-menu-accordion">
                                    {TOOLS_SUB_ITEMS.map((sub) => {
                                        const SubIcon = sub.icon;
                                        const isSubActive = activeSubTool === sub.id;
                                        return (
                                            <button
                                                key={sub.id}
                                                type="button"
                                                className={`sub-tool-item ${isSubActive ? "active" : ""}`}
                                                onClick={() =>
                                                    onSelectSubTool && onSelectSubTool(sub.id)
                                                }
                                            >
                                                <SubIcon size={13} />
                                                <span>{sub.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer Group */}
            <div className="sidebar-footer-group">
                {!isCollapsed && (
                    <>
                        <button type="button" className="footer-action-item">
                            <Globe size={14} />
                            <span>English</span>
                        </button>
                        <button type="button" className="footer-action-item">
                            <Moon size={14} />
                            <span>Theme</span>
                        </button>
                    </>
                )}
                <div className="sidebar-user-pill" title={session.name || "Huy Tran Anh"}>
                    <div className="user-avatar-tag">
                        {(session.name || "HT").slice(0, 2).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="user-meta-lines">
                            <strong>{session.name || "Huy Tran Anh"}</strong>
                            <small>v1.0.0-prod</small>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default HubSidebar;
