import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Award,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    FileText,
    GraduationCap,
    Home,
    Library,
    Search,
    Settings,
    Sparkles,
    UserCheck,
    Wrench,
    MessageSquare,
} from "lucide-react";
import BrandLogo from "../../../components/common/logo/BrandLogo";
import "./EduSidebar.css";

const EDU_SUB_TOOLS = [
    { id: "tutor", label: "Socratic Code Tutor", icon: GraduationCap },
    { id: "exam_prep", label: "Exam & Quiz Prep", icon: Sparkles },
    { id: "grader", label: "Assignment Grader", icon: CheckCircle2 },
    { id: "courseware", label: "Courseware RAG Index", icon: Library },
];

const NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "tools", label: "Edu Tools", icon: Wrench, isToolParent: true },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "quizzes", label: "Quizzes", icon: Award },
    { id: "analytics", label: "Analytics", icon: UserCheck },
    { id: "settings", label: "Settings", icon: Settings },
];

const EduSidebar = ({
    activeTab,
    onTabChange,
    session,
    isCollapsed = false,
    onToggleCollapse,
    activeSubTool = null,
    onSelectSubTool,
}) => {
    const navigate = useNavigate();
    const [isToolsSubmenuOpen, setIsToolsSubmenuOpen] = useState(true);

    const handleItemClick = (item) => {
        if (item.isToolParent) {
            onTabChange("tools");
            if (activeSubTool) {
                if (isCollapsed) {
                    onToggleCollapse && onToggleCollapse();
                    setIsToolsSubmenuOpen(true);
                } else {
                    setIsToolsSubmenuOpen((prev) => !prev);
                }
            }
        } else {
            onTabChange(item.id);
        }
    };

    return (
        <aside className={`edu-sidebar ${isCollapsed ? "collapsed-rail" : ""}`}>
            {/* Logo click toggle */}
            <div
                className="sidebar-brand-header clickable-brand-toggle"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <BrandLogo size="md" showText={!isCollapsed} title="Prism Studio" />
                {!isCollapsed && <span className="sidebar-hub-tag edu-badge">EDU</span>}
            </div>

            {/* Quick Search */}
            {!isCollapsed ? (
                <button
                    type="button"
                    className="sidebar-search-btn"
                    onClick={() => onTabChange("documents")}
                >
                    <Search size={14} />
                    <span>Search syllabus & notes...</span>
                    <kbd>Ctrl+K</kbd>
                </button>
            ) : (
                <button
                    type="button"
                    className="sidebar-search-btn-mini"
                    onClick={() => onTabChange("documents")}
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

                            {/* Dropdown Tools con */}
                            {showDropdown && isToolsSubmenuOpen && (
                                <div className="tools-sub-menu-accordion">
                                    {EDU_SUB_TOOLS.map((sub) => {
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

            {/* Footer Profile */}
            <div className="sidebar-footer-group">
                <div
                    className="sidebar-user-pill"
                    onClick={() => navigate("/overview")}
                    title="Return to Hub Matrix"
                >
                    <div className="user-avatar-tag edu-avatar">
                        {(session.name || "HT").slice(0, 2).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="user-meta-lines">
                            <strong>{session.name || "Huy Tran"}</strong>
                            <small>CS Student · HCMUTE</small>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default EduSidebar;
