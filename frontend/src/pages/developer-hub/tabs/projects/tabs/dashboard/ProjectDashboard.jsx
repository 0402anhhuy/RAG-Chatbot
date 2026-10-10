import { Terminal, Plus, ArrowRight, Users, CheckSquare, Play, CheckCircle2 } from "lucide-react";
import "./ProjectDashboard.css";

const ProjectDashboard = ({ project, onOpenWorkbench, onNavigateKanban }) => {
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

                <button type="button" className="btn-create-task-outline">
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
                    <span className="continue-eyebrow">WELCOME BACK, HUY</span>
                    <h3>Continue where you left off</h3>
                    <p>Pick up your most recent working sandbox, right where you left it.</p>
                </div>
                <button type="button" className="btn-continue-green" onClick={onOpenWorkbench}>
                    <span>Continue</span>
                    <ArrowRight size={14} />
                </button>
            </div>

            {/* 3. Lưới 4 Thẻ KPI */}
            <div className="dashboard-stats-four-grid">
                {/* Members */}
                <div className="kpi-surface-card">
                    <div className="kpi-value-row">
                        <span className="kpi-big-number">1</span>
                        <span className="kpi-label">Members</span>
                    </div>
                    <div className="kpi-member-avatar-chip">HT</div>
                </div>

                {/* Tasks */}
                <div className="kpi-surface-card">
                    <div className="kpi-value-row">
                        <CheckSquare size={16} className="kpi-header-icon" />
                        <span className="kpi-big-number">0</span>
                    </div>
                    <span className="kpi-label">Tasks</span>
                </div>

                {/* Running Sandboxes */}
                <div className="kpi-surface-card">
                    <div className="kpi-value-row">
                        <Play size={16} className="kpi-header-icon" />
                        <span className="kpi-big-number">0</span>
                    </div>
                    <span className="kpi-label">Running Sandboxes</span>
                </div>

                {/* Completed Today */}
                <div className="kpi-surface-card">
                    <div className="kpi-value-row">
                        <CheckCircle2 size={16} className="kpi-header-icon" />
                        <span className="kpi-big-number">0</span>
                    </div>
                    <span className="kpi-label">Completed Today</span>
                </div>
            </div>

            {/* 4. My Tasks Area */}
            <div className="dashboard-my-tasks-card">
                <h4>My Tasks</h4>
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
            </div>
        </div>
    );
};

export default ProjectDashboard;
