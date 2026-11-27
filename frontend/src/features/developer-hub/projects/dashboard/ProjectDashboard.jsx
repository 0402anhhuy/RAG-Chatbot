import { Terminal, Plus, ArrowRight, CheckSquare, CheckCircle2, Loader2 } from "lucide-react";
import { projectDashboardApi } from "@/api";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import { useToast } from "@/context/ToastContext.jsx";
import "@/features/developer-hub/projects/dashboard/ProjectDashboard.css";
import { getSessionUser } from "@/lib/session";

const initialsOf = (name) => {
    const source = (name || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
};

const firstNameOf = (name) => (name || "").trim().split(/\s+/)[0]?.toUpperCase() || "";

const ProjectDashboard = ({ project, onOpenWorkbench, onNavigateKanban }) => {
    const projectId = project?.id || null;
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const { data: summary, loading } = useAsyncData(
        () => projectDashboardApi.get(projectId, sessionUser?.id),
        [projectId, sessionUser?.id],
        {
            enabled: Boolean(projectId),
            errorMessage: "Unable to load the dashboard.",
            onError: (err) => showToast(err.message || "Unable to load the dashboard.", "error"),
        },
    );

    const viewerName = summary?.viewerName || sessionUser?.name || "";
    const myTasks = summary?.myTasks || [];

    return (
        <div className="project-dashboard-viewport">
            {/* 1. Thanh tiêu đề và Action Buttons */}
            <div className="dashboard-top-action-bar">
                <button
                    type="button"
                    className="btn-open-workbench-solid"
                    onClick={onOpenWorkbench}
                >
                    <Terminal size={14} />
                    <span>Open Workbench</span>
                </button>

                <button
                    type="button"
                    className="btn-create-task-outline"
                    onClick={onNavigateKanban}
                >
                    <Plus size={14} />
                    <span>Create Task</span>
                </button>
            </div>

            {/* 2. Welcome Back & Continue where you left off */}
            <div className="dashboard-continue-card">
                <div className="continue-circle-icon">
                    <ArrowRight size={18} />
                </div>
                <div className="continue-content-meta">
                    <span className="continue-eyebrow">
                        WELCOME BACK{firstNameOf(viewerName) ? `, ${firstNameOf(viewerName)}` : ""}
                    </span>
                    <h3>Continue where you left off</h3>
                    <p>Pick up your most recent work, right where you left it.</p>
                </div>
                <button type="button" className="btn-continue-green" onClick={onOpenWorkbench}>
                    <span>Continue</span>
                    <ArrowRight size={14} />
                </button>
            </div>

            {/* 3. Lưới 3 Thẻ KPI */}
            <div className="dashboard-stats-four-grid">
                {/* Members */}
                <div className="kpi-surface-card">
                    <div className="kpi-value-row">
                        <span className="kpi-big-number">
                            {summary ? summary.members : loading ? "…" : 0}
                        </span>
                        <span className="kpi-label">Members</span>
                    </div>
                    <div className="kpi-member-avatar-chip">{initialsOf(viewerName)}</div>
                </div>

                {/* Tasks */}
                <div className="kpi-surface-card">
                    <div className="kpi-value-row">
                        <CheckSquare size={16} className="kpi-header-icon" />
                        <span className="kpi-big-number">
                            {summary ? summary.tasks : loading ? "…" : 0}
                        </span>
                    </div>
                    <span className="kpi-label">Tasks</span>
                </div>

                {/* Completed Today */}
                <div className="kpi-surface-card">
                    <div className="kpi-value-row">
                        <CheckCircle2 size={16} className="kpi-header-icon" />
                        <span className="kpi-big-number">
                            {summary ? summary.completedToday : loading ? "…" : 0}
                        </span>
                    </div>
                    <span className="kpi-label">Completed Today</span>
                </div>
            </div>

            {/* 4. My Tasks Area */}
            <div className="dashboard-my-tasks-card">
                <h4>My Tasks</h4>
                {loading && !summary ? (
                    <div className="my-tasks-empty-panel">
                        <p>
                            <Loader2 size={14} /> Loading your tasks...
                        </p>
                    </div>
                ) : myTasks.length === 0 ? (
                    <div className="my-tasks-empty-panel">
                        <p>No tasks assigned to you</p>
                        <small>
                            Go to{" "}
                            <button
                                type="button"
                                className="inline-kanban-link"
                                onClick={onNavigateKanban}
                            >
                                Kanban board
                            </button>{" "}
                            to pick up or create a task
                        </small>
                    </div>
                ) : (
                    <div className="my-tasks-empty-panel">
                        {myTasks.map((task) => (
                            <div key={task.id} className="my-task-row">
                                <strong>{task.title}</strong>
                                <small>
                                    {task.statusLabel}
                                    {task.priorityLabel ? ` · ${task.priorityLabel}` : ""}
                                </small>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDashboard;
