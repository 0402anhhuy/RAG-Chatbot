import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    FolderKanban,
    ListTodo,
    Loader2,
    Pin,
    Plus,
    RefreshCw,
    Terminal,
} from "lucide-react";
import { projectApi, taskApi } from "../../../../api";
import { useToast } from "../../../../context/ToastContext";
import "./Home.css";
import { getSessionUser } from "../../../../components/common/utils/session";

const normalizeStatus = (value) => (value || "").toString().toUpperCase();

const isDoneTask = (task) => {
    const status = normalizeStatus(task.status);
    return status === "DONE" || status === "COMPLETED";
};

const isInProgressTask = (task) => normalizeStatus(task.status).includes("PROGRESS");

const Home = ({ onNavigateTab, onOpenProject, refreshKey }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadHome = useCallback(
        async (signal) => {
            if (!sessionUser?.id) return;
            try {
                setLoading(true);
                const [projectList, taskList] = await Promise.all([
                    projectApi.list({ ownerId: sessionUser.id }),
                    taskApi.list({ ownerId: sessionUser.id, archived: false }),
                ]);
                if (signal?.cancelled) return;
                setProjects(projectList || []);
                setTasks(taskList || []);
            } catch (err) {
                if (signal?.cancelled) return;
                showToast(err.message || "Unable to load your workspace.", "error");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [sessionUser?.id, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadHome(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadHome, refreshKey]);

    const handleRefresh = () => {
        loadHome();
        showToast("Workspace refreshed.", "info");
    };

    const kpis = useMemo(() => {
        const activeProjects = projects.filter(
            (p) => normalizeStatus(p.status) === "ACTIVE",
        ).length;
        const archivedProjects = projects.filter(
            (p) => normalizeStatus(p.status) === "ARCHIVED",
        ).length;
        const openTasks = tasks.filter((t) => !t.archived && !isDoneTask(t)).length;
        const inProgress = tasks.filter((t) => !t.archived && isInProgressTask(t)).length;
        const doneTasks = tasks.filter((t) => !t.archived && isDoneTask(t)).length;

        return [
            {
                id: "active_projects",
                label: "Active Projects",
                value: activeProjects,
                note: archivedProjects ? `${archivedProjects} archived` : "ready to build",
                Icon: FolderKanban,
            },
            {
                id: "open_tasks",
                label: "Open Tasks",
                value: openTasks,
                note: "waiting to be picked up",
                Icon: ListTodo,
            },
            {
                id: "in_progress",
                label: "In Progress",
                value: inProgress,
                note: "currently on your desk",
                Icon: Clock,
            },
            {
                id: "completed_tasks",
                label: "Completed",
                value: doneTasks,
                note: "shipped across projects",
                Icon: CheckCircle2,
            },
        ];
    }, [projects, tasks]);

    const recentProjects = useMemo(() => {
        const pinned = projects.filter((p) => p.pinned);
        const rest = projects.filter((p) => !p.pinned);
        return [...pinned, ...rest].slice(0, 4);
    }, [projects]);

    const activeTasks = useMemo(
        () => tasks.filter((t) => !t.archived).slice(0, 4),
        [tasks],
    );

    const firstName = (sessionUser?.name || "Dev").split(" ")[0];

    return (
        <div className="edu-home-bounds dev-home-bounds">
            {/* Hero Workspace Banner */}
            <div className="edu-resume-hero">
                <div className="resume-hero-left">
                    <div className="resume-icon-badge">
                        <Terminal size={22} />
                    </div>
                    <div className="resume-copy">
                        <span className="resume-eyebrow">WELCOME BACK</span>
                        {loading && !projects.length ? (
                            <p>Loading your workspace…</p>
                        ) : (
                            <>
                                <h3>Ready to build, {firstName}.</h3>
                                <p>
                                    Pick up where you left off across your projects, tasks and
                                    AI workspaces.
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <div className="resume-hero-actions">
                    <button
                        type="button"
                        className="btn-reload-icon"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Reload workspace"
                    >
                        {loading ? (
                            <Loader2 size={13} className="ws-spinner" />
                        ) : (
                            <RefreshCw size={13} />
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn-continue-edu"
                        onClick={() => onNavigateTab?.("projects")}
                    >
                        <Plus size={14} />
                        <span>New Project</span>
                    </button>
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="edu-kpi-grid">
                {kpis.map(({ id, label, value, note, Icon }) => (
                    <div key={id} className="edu-kpi-card">
                        <div className="kpi-card-header">
                            <span className="kpi-label">{label}</span>
                            <Icon size={14} className="kpi-icon-muted" />
                        </div>
                        <div className="kpi-value">{value}</div>
                        <span className="kpi-sub-note">{note}</span>
                    </div>
                ))}
            </div>

            {/* Recent Projects & Active Tasks */}
            <div className="edu-split-sections">
                <div className="courses-progress-card">
                    <div className="section-title-row">
                        <strong>Recent Projects</strong>
                        <button
                            type="button"
                            className="btn-text-link"
                            onClick={() => onNavigateTab?.("projects")}
                        >
                            All projects →
                        </button>
                    </div>

                    <div className="course-progress-list">
                        {recentProjects.map((project) => (
                            <div
                                key={project.id}
                                className="home-project-row"
                                onClick={() => onOpenProject?.(project)}
                            >
                                <FolderKanban size={16} color="var(--accent)" />
                                <div className="home-project-name">
                                    <strong title={project.name}>{project.name}</strong>
                                    {project.pinned ? (
                                        <small>
                                            <Pin size={10} /> Pinned
                                        </small>
                                    ) : (
                                        <small>{project.description || "Workspace"}</small>
                                    )}
                                </div>
                                <span
                                    className={`home-status-tag ${normalizeStatus(
                                        project.status,
                                    ).toLowerCase()}`}
                                >
                                    {normalizeStatus(project.status) === "ARCHIVED"
                                        ? "Archived"
                                        : "Active"}
                                </span>
                                <ArrowRight size={13} className="home-row-arrow" />
                            </div>
                        ))}
                        {!loading && recentProjects.length === 0 && (
                            <p className="section-empty-feedback">
                                No projects yet. Hit “New Project” above to create your first
                                workspace.
                            </p>
                        )}
                    </div>
                </div>

                {/* Active Tasks Across Projects */}
                <div className="ai-recs-card">
                    <div className="section-title-row">
                        <strong>Active Tasks</strong>
                        <button
                            type="button"
                            className="btn-text-link"
                            onClick={() => onNavigateTab?.("tasks")}
                        >
                            All tasks →
                        </button>
                    </div>
                    <div className="drill-action-boxes home-task-list">
                        {activeTasks.map((task) => (
                            <div
                                key={task.id}
                                className="home-task-row"
                                onClick={() => onNavigateTab?.("tasks")}
                            >
                                <span
                                    className={`home-task-status ${normalizeStatus(
                                        task.status,
                                    )
                                        .toLowerCase()
                                        .replace(/[^a-z]+/g, "-")}`}
                                >
                                    {task.statusLabel || task.status || "Open"}
                                </span>
                                <div className="home-task-copy">
                                    <strong title={task.title}>{task.title}</strong>
                                    <small>{task.projectName || "Unassigned"}</small>
                                </div>
                                <span className="home-task-updated">
                                    {task.updatedAtLabel || ""}
                                </span>
                            </div>
                        ))}
                        {!loading && activeTasks.length === 0 && (
                            <p className="section-empty-feedback">
                                No open tasks right now — add one from the Tasks tab.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
