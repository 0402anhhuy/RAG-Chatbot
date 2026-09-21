import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Clock,
    Code2,
    Database,
    ExternalLink,
    FileCode2,
    FileText,
    GraduationCap,
    HardDrive,
    Keyboard,
    Layers,
    Library,
    LogOut,
    PenTool,
    Pin,
    Plus,
    Search,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Terminal,
    Upload,
    User,
    X,
    Zap,
} from "lucide-react";
import BrandLogo from "../../components/common/logo/BrandLogo";
import UserProfileModal from "../modals/UserProfileModal";
import "./Overview.css";

const HUBS_CONFIG = [
    {
        id: "dev",
        name: "Developer Hub",
        badge: "ENGINEERING",
        tagline: "Code inspection, architecture modeling, and static security auditing.",
        accentColor: "#0284c7",
        hubRoute: "/developer-hub", // Route dẫn sang giao diện quản lý chi tiết của Dev Hub
        metrics: { repositories: 14, issuesFound: 3, coverage: "94%" },
        tools: [
            {
                id: "code_review",
                name: "Source Code Review",
                description:
                    "Deep static analysis detecting SQLi, XSS, memory leaks, and architectural smells.",
                icon: Code2,
                status: "Live Audit",
                statusType: "active",
                targetRoute: "/chat?tool=code_review",
                metricBadge: "3 alerts",
            },
            {
                id: "canvas",
                name: "Architecture Canvas",
                description:
                    "Visualize dependency flows, modular layers, and service connection topologies.",
                icon: PenTool,
                status: "Ready",
                statusType: "neutral",
                targetRoute: "/canvas",
                metricBadge: "v2.1 topology",
            },
            {
                id: "knowledge",
                name: "Knowledge Assistant",
                description:
                    "Query API specifications, RFC documents, and architecture decision records.",
                icon: BookOpen,
                status: "Synchronized",
                statusType: "success",
                targetRoute: "/chat?tool=knowledge_assistant",
                metricBadge: "128 documents",
            },
        ],
    },
    {
        id: "edu",
        name: "Academy Hub",
        badge: "EDUCATION",
        tagline: "Interactive coding tutoring, rubric evaluation, and exam generation.",
        accentColor: "#059669",
        hubRoute: "/chat?hub=edu",
        metrics: { courses: 6, quizzesTaken: 48, mastery: "89%" },
        tools: [
            {
                id: "tutor",
                name: "Code Tutor",
                description:
                    "Socratic line-by-line breakdown explaining data structures and design principles.",
                icon: GraduationCap,
                status: "Interactive",
                statusType: "active",
                targetRoute: "/chat?tool=tutor",
                metricBadge: "Module 4",
            },
            {
                id: "exam_prep",
                name: "Exam & Quiz Prep",
                description:
                    "Construct practice mock assessments and terminology flashcards from syllabus PDFs.",
                icon: Sparkles,
                status: "Ready",
                statusType: "neutral",
                targetRoute: "/chat?tool=exam_prep",
                metricBadge: "24 questions",
            },
            {
                id: "assignment_grader",
                name: "Assignment Grader",
                description:
                    "Automated scoring checking naming conventions, algorithmic efficiency, and syntax clean code.",
                icon: CheckCircle2,
                status: "Graded",
                statusType: "success",
                targetRoute: "/chat?tool=assignment_grader",
                metricBadge: "Rubric active",
            },
            {
                id: "courseware",
                name: "Courseware RAG",
                description:
                    "Search across textbook indexes, university slides, and technical coursework.",
                icon: Library,
                status: "Indexed",
                statusType: "success",
                targetRoute: "/chat?tool=courseware",
                metricBadge: "42 files",
            },
        ],
    },
];

const PINNED_ITEMS = [
    {
        id: "pin-1",
        title: "SecurityConfig.java",
        type: "code",
        hub: "Developer Hub",
        route: "/chat?tool=code_review",
        meta: "Spring Security filter chain",
    },
    {
        id: "pin-2",
        title: "Spring Security Architecture Guide.pdf",
        type: "doc",
        hub: "Developer Hub",
        route: "/chat?tool=knowledge_assistant",
        meta: "p.42 (Active context)",
    },
    {
        id: "pin-3",
        title: "CS204: Algorithms (Module 3)",
        type: "course",
        hub: "Academy Hub",
        route: "/chat?tool=exam_prep",
        meta: "Midterm practice pool",
    },
];

const RECENT_ACTIVITIES = [
    {
        id: 1,
        hubName: "Developer Hub",
        action: "Security vulnerability detected",
        target: "auth-service/src/UserRepository.java",
        detail: "CWE-89 SQL Injection concatenated at line 84",
        timestamp: "12 minutes ago",
        statusType: "critical",
        route: "/chat?tool=code_review",
    },
    {
        id: 2,
        hubName: "Developer Hub",
        action: "Knowledge Base sync completed",
        target: "Spring Security Architecture Guide.pdf",
        detail: "324 embeddings stored in Vector DB",
        timestamp: "1 hour ago",
        statusType: "success",
        route: "/chat?tool=knowledge_assistant",
    },
    {
        id: 3,
        hubName: "Academy Hub",
        action: "Practice quiz session finished",
        target: "CS204: Algorithms & Complexity",
        detail: "Score: 92% (18/20 questions correct)",
        timestamp: "Yesterday",
        statusType: "neutral",
        route: "/chat?tool=exam_prep",
    },
];

const Overview = () => {
    const navigate = useNavigate();
    const [activeHubFilter, setActiveHubFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCmdOpen, setIsCmdOpen] = useState(false);

    // User Dropdown Popover State
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    // Modal Quick Action states
    const [activeModal, setActiveModal] = useState(null);
    const [quickSnippetText, setQuickSnippetText] = useState("");
    const fileInputRef = useRef(null);

    const session = JSON.parse(
        localStorage.getItem("rag_session") ||
            '{"role":"USER","name":"Huy Tran","email":"huy@prismstudio.dev"}',
    );

    const handleLogout = () => {
        localStorage.removeItem("rag_session");
        localStorage.removeItem("token");
        navigate("/login");
    };

    // Close user dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keyboard Shortcuts (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsCmdOpen((prev) => !prev);
            }
            if (e.key === "Escape") {
                setIsCmdOpen(false);
                setIsUserMenuOpen(false);
                setActiveModal(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleRunQuickAudit = (e) => {
        e.preventDefault();
        if (!quickSnippetText.trim()) return;
        navigate("/chat?tool=code_review");
    };

    const filteredHubs = HUBS_CONFIG.filter((hub) => {
        if (activeHubFilter !== "all" && hub.id !== activeHubFilter) return false;
        return true;
    }).map((hub) => ({
        ...hub,
        tools: hub.tools.filter(
            (t) =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    }));

    return (
        <div className="overview-page-wrapper">
            {/* Topbar */}
            <header className="overview-navbar">
                {/* DÙNG COMPONENT BRAND LOGO CHUNG TẠI ĐÂY */}
                <div className="navbar-brand-unit">
                    <BrandLogo
                        size="md"
                        title="Prism Studio"
                        onClick={() => navigate("/overview")}
                    />
                    <span className="brand-env-tag">AI Engineering & Learning Hub</span>
                </div>

                <div className="navbar-search-slot">
                    <div className="universal-command-search" onClick={() => setIsCmdOpen(true)}>
                        <Search size={14} className="search-icon-muted" />
                        <input
                            type="text"
                            placeholder="Type a tool name, document, or command..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <kbd className="keybind-tag">⌘K</kbd>
                    </div>
                </div>

                {/* USER PROFILE CLUSTER WITH POPOVER MENU */}
                <div className="navbar-user-cluster" ref={userMenuRef}>
                    <button
                        type="button"
                        className={`user-profile-trigger-btn ${isUserMenuOpen ? "active" : ""}`}
                        onClick={() => setIsUserMenuOpen((prev) => !prev)}
                        title="Open Account Menu"
                    >
                        <div className="user-avatar-box">
                            {(session.name || "HU").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="user-text-column">
                            <span className="profile-display-name">
                                {session.name || "Huy Tran"}
                            </span>
                            <span className="profile-role-tag">
                                {session.role || "Software Engineer"}
                            </span>
                        </div>
                    </button>

                    {isUserMenuOpen && (
                        <div className="user-dropdown-popover">
                            <div className="popover-identity-header">
                                <div className="popover-avatar-large">
                                    {(session.name || "HU").slice(0, 2).toUpperCase()}
                                </div>
                                <div className="popover-identity-meta">
                                    <div className="identity-name-line">
                                        <strong>{session.name || "Huy Tran"}</strong>
                                        <span className="identity-role-badge">
                                            {session.role || "MEMBER"}
                                        </span>
                                    </div>
                                    <span className="identity-email-text">
                                        {session.email || "huy@prismstudio.dev"}
                                    </span>
                                </div>
                            </div>

                            <div className="popover-workspace-card">
                                <div className="popover-meta-row">
                                    <span>Tenant ID</span>
                                    <code>prism-prod-default</code>
                                </div>
                                <div className="popover-meta-row">
                                    <span>Workspace Mode</span>
                                    <strong className="status-live-green">Standard Dev Hub</strong>
                                </div>
                            </div>

                            <div className="popover-actions-menu">
                                <button
                                    type="button"
                                    className="popover-menu-item"
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        setActiveModal("profile_details");
                                    }}
                                >
                                    <User size={15} />
                                    <span>Account & Profile Information</span>
                                </button>
                                <button
                                    type="button"
                                    className="popover-menu-item"
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        navigate("/settings");
                                    }}
                                >
                                    <Settings size={15} />
                                    <span>Workspace Preferences</span>
                                </button>
                                <button
                                    type="button"
                                    className="popover-menu-item"
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        setIsCmdOpen(true);
                                    }}
                                >
                                    <Keyboard size={15} />
                                    <span>Command Palette & Shortcuts</span>
                                    <span className="item-key-tag">⌘K</span>
                                </button>
                            </div>

                            <div className="popover-footer-boundary">
                                <button
                                    type="button"
                                    className="popover-logout-btn"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={15} />
                                    <span>Sign Out of Prism Studio</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="overview-body-scroller">
                <div className="overview-content-bounds">
                    {/* Welcome Banner */}
                    <div className="overview-greeting-card">
                        <div className="greeting-main-content">
                            <span className="greeting-eyebrow">UNIFIED AI WORKSPACE</span>
                            <h1>Good evening, {session.name?.split(" ")[0] || "Huy"}.</h1>
                            <p>
                                Access engineering suites and learning assistants from a centralized
                                command center. Use the quick action tray to audit snippets or
                                launch dedicated workspaces.
                            </p>
                        </div>
                        <div className="workspace-stat-pills">
                            <div className="stat-pill-item">
                                <span className="stat-pill-label">Connected Repos</span>
                                <strong>14 active</strong>
                            </div>
                            <div className="stat-pill-item">
                                <span className="stat-pill-label">Knowledge Docs</span>
                                <strong>128 indexed</strong>
                            </div>
                            <div className="stat-pill-item">
                                <span className="stat-pill-label">Security Health</span>
                                <strong style={{ color: "#10b981" }}>98.4% passing</strong>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Tray */}
                    <div className="quick-actions-bar">
                        <span className="quick-actions-label">QUICK ACTIONS</span>
                        <div className="quick-action-btns-row">
                            <button
                                type="button"
                                className="action-pill-btn"
                                onClick={() => setActiveModal("snippet")}
                            >
                                <Code2 size={15} color="#0284c7" />
                                <span>Quick Snippet Audit</span>
                            </button>
                            <button
                                type="button"
                                className="action-pill-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={15} color="#059669" />
                                <span>Drop PDF to Vector Store</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.txt,.md"
                                hidden
                                onChange={() => navigate("/chat?tool=knowledge_assistant")}
                            />
                            <button
                                type="button"
                                className="action-pill-btn"
                                onClick={() => navigate("/chat?tool=exam_prep")}
                            >
                                <Sparkles size={15} color="#f59e0b" />
                                <span>Generate Practice Quiz</span>
                            </button>
                        </div>
                    </div>

                    {/* Pinned Contexts Tray */}
                    <div className="pinned-workspaces-tray">
                        <div className="tray-heading-row">
                            <div className="tray-title-group">
                                <Pin size={14} color="#64748b" />
                                <span>PINNED CONTEXTS</span>
                            </div>
                            <span className="tray-hint">Click to resume immediate inspection</span>
                        </div>
                        <div className="pinned-cards-grid">
                            {PINNED_ITEMS.map((item) => (
                                <div
                                    key={item.id}
                                    className="pinned-item-card"
                                    onClick={() => navigate(item.route)}
                                >
                                    <div className="pinned-icon-wrapper">
                                        {item.type === "code" ? (
                                            <FileCode2 size={16} color="#0284c7" />
                                        ) : item.type === "doc" ? (
                                            <FileText size={16} color="#059669" />
                                        ) : (
                                            <Library size={16} color="#f59e0b" />
                                        )}
                                    </div>
                                    <div className="pinned-text-meta">
                                        <strong className="pinned-file-title">{item.title}</strong>
                                        <span className="pinned-file-note">{item.meta}</span>
                                    </div>
                                    <span className="pinned-badge-hub">{item.hub}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suite Category Navigation */}
                    <div className="hub-filter-bar">
                        <button
                            type="button"
                            className={`hub-filter-pill ${activeHubFilter === "all" ? "active" : ""}`}
                            onClick={() => setActiveHubFilter("all")}
                        >
                            <Layers size={14} /> All Suites (
                            {HUBS_CONFIG.reduce((acc, h) => acc + h.tools.length, 0)})
                        </button>
                        <button
                            type="button"
                            className={`hub-filter-pill ${activeHubFilter === "dev" ? "active" : ""}`}
                            onClick={() => setActiveHubFilter("dev")}
                        >
                            <Code2 size={14} /> Developer Hub
                        </button>
                        <button
                            type="button"
                            className={`hub-filter-pill ${activeHubFilter === "edu" ? "active" : ""}`}
                            onClick={() => setActiveHubFilter("edu")}
                        >
                            <GraduationCap size={14} /> Academy Hub (Edu)
                        </button>
                    </div>

                    {/* Hubs & Tools Display Matrix */}
                    <div className="hub-sections-container">
                        {filteredHubs.map((hub) => (
                            <section key={hub.id} className="hub-category-card">
                                <div className="hub-card-header">
                                    <div className="hub-header-titles">
                                        <div className="hub-title-row">
                                            <h2>{hub.name}</h2>
                                            <span className="hub-badge-flag">{hub.badge}</span>
                                        </div>
                                        <p className="hub-tagline-text">{hub.tagline}</p>
                                    </div>

                                    {/* KHỐI NÚT ACTION MỚI DẪN TỚI DEVELOPER HUB */}
                                    <div className="hub-header-actions-block">
                                        <div className="hub-header-meta">
                                            {hub.id === "dev" ? (
                                                <span>
                                                    {hub.metrics.repositories} Repos ·{" "}
                                                    {hub.metrics.coverage} Audit Score
                                                </span>
                                            ) : (
                                                <span>
                                                    {hub.metrics.courses} Syllabi ·{" "}
                                                    {hub.metrics.mastery} Overall Score
                                                </span>
                                            )}
                                        </div>

                                        {hub.hubRoute && (
                                            <button
                                                type="button"
                                                className="btn-open-hub-launcher"
                                                onClick={() => navigate(hub.hubRoute)}
                                            >
                                                <span>Open {hub.name}</span>
                                                <ExternalLink size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="tools-cards-matrix">
                                    {hub.tools.map((tool) => {
                                        const ToolIcon = tool.icon;
                                        return (
                                            <div
                                                key={tool.id}
                                                className="tool-action-card"
                                                onClick={() => navigate(tool.targetRoute)}
                                            >
                                                <div className="tool-card-top-row">
                                                    <div
                                                        className="tool-card-icon-frame"
                                                        style={{
                                                            color: hub.accentColor,
                                                            backgroundColor: `${hub.accentColor}12`,
                                                        }}
                                                    >
                                                        <ToolIcon size={20} />
                                                    </div>
                                                    <span
                                                        className={`tool-status-tag ${tool.statusType}`}
                                                    >
                                                        {tool.status}
                                                    </span>
                                                </div>

                                                <div className="tool-card-narrative">
                                                    <h3>{tool.name}</h3>
                                                    <p>{tool.description}</p>
                                                </div>

                                                <div className="tool-card-footer">
                                                    <span className="tool-metric-badge">
                                                        {tool.metricBadge}
                                                    </span>
                                                    <span className="tool-launch-arrow">
                                                        Launch <ArrowRight size={13} />
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>

                    {/* 2-Column Split: Activity Ledger & System Health */}
                    <div className="overview-bottom-grid">
                        <section className="activity-records-section">
                            <div className="activity-records-header">
                                <div>
                                    <h3>Recent Activity Ledger</h3>
                                    <p>
                                        Live event streaming across connected repositories and
                                        courseware.
                                    </p>
                                </div>
                                <span className="activity-sync-indicator">Realtime Feed</span>
                            </div>

                            <div className="activity-list-container">
                                {RECENT_ACTIVITIES.map((act) => (
                                    <div
                                        key={act.id}
                                        className="activity-row-item"
                                        onClick={() => navigate(act.route)}
                                    >
                                        <span className={`status-signal-dot ${act.statusType}`} />
                                        <div className="activity-core-col">
                                            <div className="activity-primary-line">
                                                <span className="activity-hub-tag">
                                                    {act.hubName}
                                                </span>
                                                <strong>{act.action}</strong>
                                                <span className="activity-target-code">
                                                    {act.target}
                                                </span>
                                            </div>
                                            <span className="activity-detail-line">
                                                {act.detail}
                                            </span>
                                        </div>
                                        <span className="activity-time-stamp">{act.timestamp}</span>
                                        <ArrowRight size={14} className="activity-hover-arrow" />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <aside className="system-health-panel">
                            <div className="health-panel-header">
                                <h3>Engine & Service Quota</h3>
                                <span className="badge-online">Online</span>
                            </div>

                            <div className="health-status-items">
                                <div className="health-item-row">
                                    <div className="health-item-meta">
                                        <span className="health-item-name">
                                            <Database size={14} color="#0284c7" /> Vector Store
                                            (RAG)
                                        </span>
                                        <small>FastAPI Server connected</small>
                                    </div>
                                    <span className="health-value-green">142ms</span>
                                </div>

                                <div className="health-item-row">
                                    <div className="health-item-meta">
                                        <span className="health-item-name">
                                            <Terminal size={14} color="#059669" /> Inspection
                                            Sandbox
                                        </span>
                                        <small>Read-only isolated container</small>
                                    </div>
                                    <span className="health-value-green">Healthy</span>
                                </div>

                                <div className="health-item-row">
                                    <div className="health-item-meta">
                                        <span className="health-item-name">
                                            <Zap size={14} color="#f59e0b" /> Daily AI Audits
                                        </span>
                                        <small>18 / 100 queries consumed today</small>
                                    </div>
                                    <div className="quota-progress-track">
                                        <div className="quota-fill-bar" style={{ width: "18%" }} />
                                    </div>
                                </div>
                            </div>

                            <div className="health-footer-info">
                                <span>
                                    Tenant: <strong>prism-prod-default</strong>
                                </span>
                                <span>
                                    Region: <strong>ap-southeast-1</strong>
                                </span>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            {/* MODAL: QUICK SNIPPET AUDIT */}
            {activeModal === "snippet" && (
                <div className="modal-backdrop-scrim" onClick={() => setActiveModal(null)}>
                    <div className="quick-audit-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header-bar">
                            <div className="dialog-title-wrap">
                                <Code2 size={18} color="#0284c7" />
                                <strong>Quick Code Snippet Audit</strong>
                            </div>
                            <button
                                type="button"
                                className="dialog-close-btn"
                                onClick={() => setActiveModal(null)}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleRunQuickAudit} className="dialog-form-body">
                            <p className="dialog-instruction">
                                Paste any function or controller snippet below to inspect SQL
                                injection, XSS, or architectural smells immediately without
                                selecting a project.
                            </p>
                            <textarea
                                autoFocus
                                rows={8}
                                placeholder="public User findByEmail(String email) { ... }"
                                value={quickSnippetText}
                                onChange={(e) => setQuickSnippetText(e.target.value)}
                                className="snippet-textarea"
                            />
                            <div className="dialog-footer-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setActiveModal(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!quickSnippetText.trim()}
                                    className="btn-audit-submit"
                                >
                                    Analyze in Code Review <ArrowRight size={14} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* COMMAND PALETTE MODAL (Cmd+K) */}
            {isCmdOpen && (
                <div className="cmd-backdrop-curtain" onClick={() => setIsCmdOpen(false)}>
                    <div className="cmd-dialog-frame" onClick={(e) => e.stopPropagation()}>
                        <div className="cmd-search-input-bar">
                            <Search size={16} className="cmd-glass-icon" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search all suites, tools, and technical documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span className="cmd-dismiss-chip">ESC</span>
                        </div>

                        <div className="cmd-results-scroller">
                            <div className="cmd-category-tag">Developer Hub Tools</div>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/chat?tool=code_review");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <Code2 size={16} color="#0284c7" />
                                <span>Source Code Review</span>
                                <span className="cmd-subtext-note">
                                    Static Inspection & Vulnerability Detection
                                </span>
                            </button>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/developer-hub");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <Terminal size={16} color="#0284c7" />
                                <span>Developer Hub Workspace</span>
                                <span className="cmd-subtext-note">
                                    Projects, Sandboxes & Task Manager
                                </span>
                            </button>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/canvas");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <PenTool size={16} color="#0284c7" />
                                <span>Architecture Canvas</span>
                                <span className="cmd-subtext-note">
                                    System Topology & Data Flow
                                </span>
                            </button>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/chat?tool=knowledge_assistant");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <BookOpen size={16} color="#0284c7" />
                                <span>Knowledge Assistant</span>
                                <span className="cmd-subtext-note">RAG Architecture Documents</span>
                            </button>

                            <div className="cmd-category-tag">Academy Hub Tools</div>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/chat?tool=tutor");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <GraduationCap size={16} color="#059669" />
                                <span>Code Tutor</span>
                                <span className="cmd-subtext-note">
                                    Interactive Socratic Mentoring
                                </span>
                            </button>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/chat?tool=exam_prep");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <Sparkles size={16} color="#059669" />
                                <span>Exam & Quiz Prep</span>
                                <span className="cmd-subtext-note">
                                    Practice Assessments from Courseware
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal thông tin User Snapshot */}
            <UserProfileModal
                isOpen={activeModal === "profile_details"}
                onClose={() => setActiveModal(null)}
                session={session}
            />
        </div>
    );
};

export default Overview;
