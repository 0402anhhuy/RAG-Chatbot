import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Code2,
    Database,
    ExternalLink,
    FileCode2,
    GraduationCap,
    Keyboard,
    Layers,
    Library,
    Loader2,
    LogOut,
    PenTool,
    Pin,
    Search,
    Settings,
    Sparkles,
    Terminal,
    Upload,
    User,
    X,
    Zap,
} from "lucide-react";
import BrandLogo from "@/components/logo/BrandLogo.jsx";
import TriangleField from "@/components/canvas/TriangleField.jsx";
import UserProfileModal from "@/features/profile/UserProfileModal.jsx";
import { useTheme } from "@/context/ThemeContext.jsx";
import { themeMeta, THEMES } from "@/components/theme/themeMeta.jsx";
import ThemePicker from "@/components/theme/ThemePicker.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import { academyHomeApi, documentApi, projectApi, request, taskApi } from "@/api";
import "@/features/overview/Overview.css";
import { getSessionUser, clearSession } from "@/lib/session";

const HUBS_CONFIG = [
    {
        id: "dev",
        name: "Developer Hub",
        badge: "ENGINEERING",
        tagline: "Code inspection, architecture modeling, and static security auditing.",
        accentClass: "hub-accent-dev",
        hubRoute: "/developer-hub",
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
            },
        ],
    },
    {
        id: "edu",
        name: "Academy Hub",
        badge: "EDUCATION",
        tagline: "Interactive coding tutoring, rubric evaluation, and exam generation.",
        accentClass: "hub-accent-edu",
        hubRoute: "/academy-hub", // Đã chuyển hướng sang trang Academy Hub mới
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
            },
        ],
    },
];

const normalizeStatus = (value) => (value || "").toString().toUpperCase();

const isDoneTask = (task) => {
    const status = normalizeStatus(task.status);
    return status === "DONE" || status === "COMPLETED";
};

const mapTaskStatusType = (status) => {
    const s = normalizeStatus(status);
    if (s === "COMPLETED" || s === "DONE") return "success";
    if (s === "IN_PROGRESS") return "active";
    if (s === "BLOCKED" || s === "FAILED") return "critical";
    return "neutral";
};

const formatRelative = (iso) => {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diffMs = Date.now() - then;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return new Date(iso).toLocaleDateString();
};

const computeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
};

const Overview = () => {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { showToast } = useToast();
    const sessionUser = getSessionUser();
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

    // Real data fetched from backend
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [academy, setAcademy] = useState(null);
    const [backendOnline, setBackendOnline] = useState(true);
    const [ragOnline, setRagOnline] = useState(true);
    const [backendLatency, setBackendLatency] = useState(null);
    const [ragLatency, setRagLatency] = useState(null);

    const handleLogout = () => {
        clearSession();
        navigate("/login");
    };

    const { loading } = useAsyncData(
        async () => {
            const userId = sessionUser?.id;

            const backendStart = performance.now();
            const [projectList, taskList, workspaceList] = await Promise.all([
                projectApi.list({ ownerId: userId }),
                taskApi.list({ ownerId: userId, archived: false }),
                request("/workspaces").catch(() => []),
            ]);
            setProjects(projectList || []);
            setTasks(taskList || []);
            setWorkspaces(workspaceList || []);
            setBackendLatency(Math.round(performance.now() - backendStart));
            setBackendOnline(true);

            const workspaceId = (workspaceList || [])[0]?.id;
            if (!workspaceId) {
                setDocuments([]);
                setRagLatency(null);
                setRagOnline(true);
                setAcademy(null);
                return;
            }

            const ragStart = performance.now();
            const [academyData, docList] = await Promise.all([
                academyHomeApi.get({ ownerId: userId, workspaceId, range: "all" }).catch(() => null),
                documentApi
                    .getByWorkspace(workspaceId)
                    .then((result) => {
                        setRagLatency(Math.round(performance.now() - ragStart));
                        setRagOnline(true);
                        return result;
                    })
                    .catch(() => {
                        setRagOnline(false);
                        return [];
                    }),
            ]);
            setAcademy(academyData);
            setDocuments(docList || []);
        },
        [sessionUser?.id],
        {
            enabled: Boolean(sessionUser?.id),
            onError: (err) => {
                setBackendOnline(false);
                showToast(err.message || "Unable to load workspace overview.", "error");
            },
        },
    );

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

    // ---- Real metrics derived from backend data ----
    const devStats = useMemo(() => {
        const total = projects.length;
        const active = projects.filter((p) => normalizeStatus(p.status) === "ACTIVE").length;
        const totalTasks = tasks.length;
        const doneTasks = tasks.filter(isDoneTask).length;
        const openTasks = totalTasks - doneTasks;
        const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : null;
        return { total, active, totalTasks, doneTasks, openTasks, completion };
    }, [projects, tasks]);

    const docStats = useMemo(() => {
        const total = documents.length;
        const indexed = documents.filter((d) => normalizeStatus(d.status) === "READY").length;
        const chunkTotal = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0);
        return { total, indexed, chunkTotal };
    }, [documents]);

    const academyKpis = useMemo(() => {
        const map = {};
        (academy?.kpis || []).forEach((kpi) => {
            map[kpi.id] = kpi;
        });
        return map;
    }, [academy]);

    const eduStats = useMemo(() => {
        const courses = academy?.courses?.length ?? null;
        const masteryKpi = academyKpis.average_mastery;
        const quizzesKpi = academyKpis.quizzes_solved;
        const streak = academy?.streak ?? null;
        return {
            courses,
            mastery: masteryKpi?.hasData ? masteryKpi.value : null,
            quizzes: quizzesKpi?.hasData ? quizzesKpi.value : null,
            streakDays: streak?.days ?? null,
        };
    }, [academy, academyKpis]);

    const servicesOnline = backendOnline && ragOnline;

    const greeting = useMemo(() => {
        const g = academy?.greeting || computeGreeting();
        return g.charAt(0).toUpperCase() + g.slice(1);
    }, [academy]);

    // Hubs with real metrics merged into the static config
    const hubs = useMemo(
        () =>
            HUBS_CONFIG.map((hub) => {
                if (hub.id === "dev") {
                    return {
                        ...hub,
                        metrics: {
                            repositories: loading ? null : devStats.total,
                            completion: devStats.completion,
                            openTasks: devStats.openTasks,
                        },
                        tools: hub.tools.map((tool) => {
                            let metricBadge = null;
                            if (tool.id === "code_review" && !loading && devStats.openTasks > 0) {
                                metricBadge = `${devStats.openTasks} open task${devStats.openTasks > 1 ? "s" : ""}`;
                            }
                            if (tool.id === "knowledge" && !loading && docStats.total > 0) {
                                metricBadge = `${docStats.total} document${docStats.total > 1 ? "s" : ""}`;
                            }
                            return { ...tool, metricBadge };
                        }),
                    };
                }
                return {
                    ...hub,
                    metrics: {
                        courses: loading ? null : (eduStats.courses ?? 0),
                        mastery: loading ? null : (eduStats.mastery ?? "—"),
                        quizzes: eduStats.quizzes,
                        streakDays: eduStats.streakDays,
                    },
                    tools: hub.tools.map((tool) => {
                        let metricBadge = null;
                        if (tool.id === "tutor" && !loading && eduStats.streakDays > 0) {
                            metricBadge = `${eduStats.streakDays}-day streak`;
                        }
                        if (tool.id === "exam_prep" && !loading && eduStats.quizzes) {
                            metricBadge = `${eduStats.quizzes} quizzes solved`;
                        }
                        if (tool.id === "assignment_grader" && !loading && eduStats.mastery) {
                            metricBadge = `${eduStats.mastery} avg mastery`;
                        }
                        if (tool.id === "courseware" && !loading && docStats.indexed > 0) {
                            metricBadge = `${docStats.indexed} files indexed`;
                        }
                        return { ...tool, metricBadge };
                    }),
                };
            }),
        [loading, devStats, eduStats, docStats],
    );

    // Pinned items = real pinned projects from backend
    const pinnedItems = useMemo(
        () =>
            projects
                .filter((p) => p.pinned)
                .slice(0, 3)
                .map((p) => ({
                    id: p.id,
                    title: p.name,
                    type: "code",
                    route: "/developer-hub",
                    meta: `${p.tasks ?? 0} tasks · updated ${formatRelative(p.updatedAt || p.createdAt)}`,
                })),
        [projects],
    );

    // Recent activities assembled from real projects, tasks and documents
    const recentActivities = useMemo(() => {
        const items = [];
        tasks.forEach((task) => {
            items.push({
                id: `task-${task.id}`,
                hubName: "Developer Hub",
                action: isDoneTask(task) ? "Task completed" : "Task updated",
                target: task.title,
                detail: `${task.projectName || "Unassigned"} · ${task.statusLabel || normalizeStatus(task.status)}`,
                timestamp: task.updatedAt || task.createdAt,
                statusType: mapTaskStatusType(task.status),
                route: "/developer-hub",
            });
        });
        projects.forEach((project) => {
            items.push({
                id: `project-${project.id}`,
                hubName: "Developer Hub",
                action: "Project updated",
                target: project.name,
                detail: `${project.tasks ?? 0} tasks · ${normalizeStatus(project.status)}`,
                timestamp: project.updatedAt || project.createdAt,
                statusType: "neutral",
                route: "/developer-hub",
            });
        });
        documents.forEach((doc) => {
            items.push({
                id: `document-${doc.id}`,
                hubName: "Academy Hub",
                action: "Document uploaded",
                target: doc.title || doc.filename,
                detail: `${doc.courseCode || "GEN"} · ${doc.status} · ${doc.fileSizeFormatted || ""}`.trim(),
                timestamp: doc.createdAt,
                statusType:
                    normalizeStatus(doc.status) === "READY"
                        ? "success"
                        : normalizeStatus(doc.status) === "FAILED"
                          ? "critical"
                          : "neutral",
                route: "/academy-hub",
            });
        });
        return items
            .filter((item) => item.timestamp)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 6);
    }, [tasks, projects, documents]);

    const currentWorkspaceName = workspaces[0]?.name || null;

    const filteredHubs = hubs.filter((hub) => {
        if (activeHubFilter !== "all" && hub.id !== activeHubFilter) return false;
        return true;
    });

    const displayName = sessionUser?.name || "there";
    const avatarInitials = (sessionUser?.name || sessionUser?.email || "U")
        .replace(/[^a-zA-Z ]/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "U";

    return (
        <div className="overview-page-wrapper">
            {/* Nền tam giác động (chỉ trang Overview) */}
            <TriangleField />
            {/* Topbar */}
            <header className="overview-navbar">
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
                    <ThemePicker
                        direction="down"
                        align="right"
                        iconSize={16}
                        triggerClassName="theme-toggle-btn"
                    />

                    <button
                        type="button"
                        className={`user-profile-trigger-btn ${isUserMenuOpen ? "active" : ""}`}
                        onClick={() => setIsUserMenuOpen((prev) => !prev)}
                        title="Open Account Menu"
                    >
                        <div className="user-avatar-box">{avatarInitials}</div>
                        <div className="user-text-column">
                            <span className="profile-display-name">{displayName}</span>
                            <span className="profile-role-tag">
                                {sessionUser?.role || "MEMBER"}
                            </span>
                        </div>
                    </button>

                    {isUserMenuOpen && (
                        <div className="user-dropdown-popover">
                            <div className="popover-identity-header">
                                <div className="popover-avatar-large">{avatarInitials}</div>
                                <div className="popover-identity-meta">
                                    <div className="identity-name-line">
                                        <strong>{displayName}</strong>
                                        <span className="identity-role-badge">
                                            {sessionUser?.role || "MEMBER"}
                                        </span>
                                    </div>
                                    <span className="identity-email-text">
                                        {sessionUser?.email || "—"}
                                    </span>
                                </div>
                            </div>

                            <div className="popover-workspace-card">
                                <div className="popover-meta-row">
                                    <span>Workspace</span>
                                    <code>{currentWorkspaceName || "—"}</code>
                                </div>
                                <div className="popover-meta-row">
                                    <span>Connected Workspaces</span>
                                    <strong className="status-live-green">
                                        {loading ? "…" : workspaces.length}
                                    </strong>
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
                                <div className="popover-theme-row" role="group" aria-label="Appearance">
                                    <span className="popover-theme-label">Appearance</span>
                                    <div className="popover-theme-options">
                                        {THEMES.map((value) => {
                                            const itemMeta = themeMeta(value);
                                            const ItemIcon = itemMeta.icon;
                                            const active = theme === value;
                                            return (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    className={`theme-swatch ${active ? "active" : ""}`}
                                                    onClick={() => setTheme(value)}
                                                    aria-pressed={active}
                                                    title={itemMeta.title}
                                                >
                                                    <ItemIcon size={14} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
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
                            <h1>Good {greeting.toLowerCase()}, {displayName}.</h1>
                            <p>
                                Access engineering suites and learning assistants from a centralized
                                command center. Use the quick action tray to audit snippets or
                                launch dedicated workspaces.
                            </p>
                        </div>
                        <div className="workspace-stat-pills">
                            <div className="stat-pill-item">
                                <span className="stat-pill-label">Connected Repos</span>
                                <strong>
                                    {loading ? "…" : `${devStats.active} active`}
                                </strong>
                            </div>
                            <div className="stat-pill-item">
                                <span className="stat-pill-label">Knowledge Docs</span>
                                <strong>
                                    {loading ? "…" : `${docStats.indexed} indexed`}
                                </strong>
                            </div>
                            <div className="stat-pill-item">
                                <span className="stat-pill-label">Task Completion</span>
                                <strong
                                    style={
                                        devStats.completion !== null
                                            ? { color: "var(--success-bright)" }
                                            : undefined
                                    }
                                >
                                    {loading
                                        ? "…"
                                        : devStats.completion !== null
                                          ? `${devStats.completion}% done`
                                          : "—"}
                                </strong>
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
                                <Code2 size={15} color="var(--accent)" />
                                <span>Quick Snippet Audit</span>
                            </button>
                            <button
                                type="button"
                                className="action-pill-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={15} color="var(--success)" />
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
                                <Sparkles size={15} color="var(--warning)" />
                                <span>Generate Practice Quiz</span>
                            </button>
                        </div>
                    </div>

                    {/* Pinned Contexts Tray — chỉ render khi có project đã pin */}
                    {!loading && pinnedItems.length > 0 && (
                        <div className="pinned-workspaces-tray">
                            <div className="tray-heading-row">
                                <div className="tray-title-group">
                                    <Pin size={13} color="var(--violet)" />
                                    <span>PINNED CONTEXTS</span>
                                    <span className="tray-count">{pinnedItems.length}</span>
                                </div>
                                <span className="tray-hint">Pick up where you left off</span>
                            </div>
                            <div className="pinned-cards-grid">
                                {pinnedItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="pinned-item-card"
                                        onClick={() => navigate(item.route)}
                                    >
                                        <span className="pinned-icon-wrapper">
                                            <FileCode2 size={15} />
                                        </span>
                                        <span className="pinned-text-meta">
                                            <strong className="pinned-file-title">
                                                {item.title}
                                            </strong>
                                            <span className="pinned-file-note">{item.meta}</span>
                                        </span>
                                        <ArrowRight size={14} className="pinned-go-arrow" />
                                        <Pin size={40} className="pinned-watermark" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

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

                                    {/* NÚT ACTION CHUYỂN TỚI WORKSPACE CỦA HUB TƯƠNG ỨNG */}
                                    <div className="hub-header-actions-block">
                                        <div className="hub-header-meta">
                                            {hub.id === "dev" ? (
                                                <span>
                                                    {hub.metrics.repositories ?? "—"} Repos ·{" "}
                                                    {hub.metrics.completion !== null
                                                        ? `${hub.metrics.completion}% Completion`
                                                        : "— Completion"}
                                                </span>
                                            ) : (
                                                <span>
                                                    {hub.metrics.courses} Courses ·{" "}
                                                    {hub.metrics.mastery} Avg Mastery
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
                                                        className={`tool-card-icon-frame ${hub.accentClass}`}
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
                                                    {tool.metricBadge && (
                                                        <span className="tool-metric-badge">
                                                            {tool.metricBadge}
                                                        </span>
                                                    )}
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
                                <span className="activity-sync-indicator">
                                    {loading
                                        ? "Syncing…"
                                        : `${recentActivities.length} recent event${recentActivities.length === 1 ? "" : "s"}`}
                                </span>
                            </div>

                            <div className="activity-list-container">
                                {loading ? (
                                    <div className="overview-empty-state">
                                        <Loader2 size={15} className="overview-spin" />
                                        <span>Loading activity feed…</span>
                                    </div>
                                ) : recentActivities.length === 0 ? (
                                    <div className="overview-empty-state">
                                        <span>
                                            No activity yet — updates from your projects, tasks
                                            and courseware will appear here.
                                        </span>
                                    </div>
                                ) : (
                                    recentActivities.map((act) => (
                                        <div
                                            key={act.id}
                                            className="activity-row-item"
                                            onClick={() => navigate(act.route)}
                                        >
                                            <span
                                                className={`status-signal-dot ${act.statusType}`}
                                            />
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
                                            <span className="activity-time-stamp">
                                                {formatRelative(act.timestamp)}
                                            </span>
                                            <ArrowRight size={14} className="activity-hover-arrow" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <aside className="system-health-panel">
                            <div className="health-panel-header">
                                <h3>Engine & Service Quota</h3>
                                {servicesOnline ? (
                                    <span className="badge-online">Online</span>
                                ) : (
                                    <span className="badge-offline">Degraded</span>
                                )}
                            </div>

                            <div className="health-status-items">
                                <div className="health-item-row">
                                    <div className="health-item-meta">
                                        <span className="health-item-name">
                                            <Database size={14} color="var(--accent)" /> Vector Store
                                            (RAG)
                                        </span>
                                        <small>
                                            {loading
                                                ? "Checking connection…"
                                                : ragOnline
                                                  ? `${docStats.indexed}/${docStats.total} docs indexed`
                                                  : "Vector store unreachable"}
                                        </small>
                                    </div>
                                    <span
                                        className={
                                            ragOnline ? "health-value-green" : "health-value-red"
                                        }
                                    >
                                        {loading
                                            ? "…"
                                            : ragOnline
                                              ? ragLatency !== null
                                                  ? `${ragLatency}ms`
                                                  : "—"
                                              : "Offline"}
                                    </span>
                                </div>

                                <div className="health-item-row">
                                    <div className="health-item-meta">
                                        <span className="health-item-name">
                                            <Terminal size={14} color="var(--success)" /> Backend
                                            API
                                        </span>
                                        <small>
                                            {loading
                                                ? "Checking connection…"
                                                : backendOnline
                                                  ? "Spring Boot services connected"
                                                  : "Backend unreachable"}
                                        </small>
                                    </div>
                                    <span
                                        className={
                                            backendOnline
                                                ? "health-value-green"
                                                : "health-value-red"
                                        }
                                    >
                                        {loading
                                            ? "…"
                                            : backendOnline
                                              ? backendLatency !== null
                                                  ? `${backendLatency}ms`
                                                  : "—"
                                              : "Offline"}
                                    </span>
                                </div>

                                <div className="health-item-row">
                                    <div className="health-item-meta">
                                        <span className="health-item-name">
                                            <Zap size={14} color="var(--warning)" /> Task
                                            Throughput
                                        </span>
                                        <small>
                                            {loading
                                                ? "Loading tasks…"
                                                : `${devStats.doneTasks} / ${devStats.totalTasks} tasks completed`}
                                        </small>
                                    </div>
                                    <div className="quota-progress-track">
                                        <div
                                            className="quota-fill-bar"
                                            style={{
                                                width: `${devStats.completion ?? 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="health-footer-info">
                                <span>
                                    Workspace: <strong>{currentWorkspaceName || "—"}</strong>
                                </span>
                                <span>
                                    Workspaces:{" "}
                                    <strong>{loading ? "…" : workspaces.length}</strong>
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
                                <Code2 size={18} color="var(--accent)" />
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
                            <div className="cmd-category-tag">Hub Workspaces</div>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/developer-hub");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <Terminal size={16} color="var(--accent)" />
                                <span>Developer Hub Workspace</span>
                                <span className="cmd-subtext-note">
                                    Engineering Sandboxes, Projects & Code Audits
                                </span>
                            </button>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/academy-hub");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <GraduationCap size={16} color="var(--success)" />
                                <span>Academy Hub Workspace</span>
                                <span className="cmd-subtext-note">
                                    Courseware RAG, Socratic Tutoring & Quizzes
                                </span>
                            </button>

                            <div className="cmd-category-tag">Developer Hub Tools</div>
                            <button
                                type="button"
                                className="cmd-option-btn"
                                onClick={() => {
                                    navigate("/chat?tool=code_review");
                                    setIsCmdOpen(false);
                                }}
                            >
                                <Code2 size={16} color="var(--accent)" />
                                <span>Source Code Review</span>
                                <span className="cmd-subtext-note">
                                    Static Inspection & Vulnerability Detection
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
                                <PenTool size={16} color="var(--accent)" />
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
                                <BookOpen size={16} color="var(--accent)" />
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
                                <GraduationCap size={16} color="var(--success)" />
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
                                <Sparkles size={16} color="var(--success)" />
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
                session={sessionUser}
                workspaceName={currentWorkspaceName}
                workspaceCount={workspaces.length}
                docStats={docStats}
                chunkTotal={docStats.chunkTotal}
            />
        </div>
    );
};

export default Overview;
