import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RotateCw, Search, Terminal } from "lucide-react";
import { kanbanApi, taskApi } from "../../../../../../api";
import CustomSelector from "../../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../../context/ToastContext";
import CreateTaskModal from "../../components/modals/kanban-task/CreateTaskModal";
import DetailTaskModal from "../../components/modals/kanban-task/DetailTaskModal";
import "./ProjectKanban.css";
import { getSessionUser } from "../../../../../../components/common/utils/session";
// Cot hien thi: id khop TaskStatus cua BE, colorClass khop CSS co san
const COLUMN_META = [
    { status: "BACKLOG", title: "Backlog", colorClass: "dot-backlog" },
    { status: "IN_PROGRESS", title: "In Progress", colorClass: "dot-in-progress" },
    { status: "REVIEW", title: "Review", colorClass: "dot-review" },
    { status: "COMPLETED", title: "Completed", colorClass: "dot-completed" },
];

const initialsOf = (name) => (name || "?").trim().slice(0, 2).toUpperCase();

const toCard = (task) => ({
    id: task.id,
    title: task.title,
    description: task.description || "",
    labels: task.labels || [],
    storyPoints: task.storyPoints || "",
    originalEstimate: task.originalEstimate || "",
    remainingEstimate: task.remainingEstimate || "",
    status: task.status,
    priority: task.priority,
    priorityLabel: task.priorityLabel || task.priority,
    assigneeId: task.assigneeId || null,
    assigneeName: task.assigneeName || null,
    assigneeEmail: task.assigneeEmail || null,
    createdAt: task.createdAt || null,
});

const ProjectKanban = ({ project = null, onOpenWorkbench }) => {
    const { showToast } = useToast();
    const sessionUser = getSessionUser();
    const projectId = project?.id || null;

    const [columns, setColumns] = useState({});
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [assigneeFilter, setAssigneeFilter] = useState("all");
    const [dragTaskId, setDragTaskId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [defaultTargetStatus, setDefaultTargetStatus] = useState("BACKLOG");
    const [selectedTask, setSelectedTask] = useState(null);

    // Gom task theo status de render 4 cot; cot rong van hien thi
    const applyBoard = (data) => {
        const nextColumns = {};
        COLUMN_META.forEach((meta) => {
            nextColumns[meta.status] = [];
        });
        (data?.columns || []).forEach((column) => {
            nextColumns[column.status] = (column.tasks || []).map(toCard);
        });
        setColumns(nextColumns);
        setMembers(data?.members || []);
    };

    const loadBoard = useCallback(
        async (signal) => {
            if (!projectId) {
                setColumns({});
                setMembers([]);
                return;
            }
            try {
                setLoading(true);
                setError("");
                const data = await kanbanApi.getBoard(projectId);
                if (signal?.cancelled) return;
                applyBoard(data);
            } catch (err) {
                if (signal?.cancelled) return;
                setColumns({});
                setMembers([]);
                setError(err.message || "Unable to load the board.");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [projectId],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadBoard(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadBoard, refreshKey]);

    const assigneeOptions = useMemo(
        () => [
            { value: "all", label: "All assignees" },
            { value: "me", label: "Assigned to me" },
            ...members
                .filter((member) => member.userId !== sessionUser?.id)
                .map((member) => ({ value: member.userId, label: member.name || member.email })),
        ],
        [members, sessionUser?.id],
    );

    const matchesFilters = (task) => {
        if (searchQuery.trim()) {
            const needle = searchQuery.trim().toLowerCase();
            if (!task.title.toLowerCase().includes(needle)) return false;
        }
        if (assigneeFilter === "me") return task.assigneeId === sessionUser?.id;
        if (assigneeFilter !== "all") return task.assigneeId === assigneeFilter;
        return true;
    };

    // ----- Tao / cap nhat / archive -----
    const handleCreateTask = async (formData) => {
        if (!projectId) return;
        try {
            await taskApi.create(
                {
                    title: formData.title,
                    description: formData.description,
                    projectId,
                    assigneeEmail: formData.assigneeEmail || null,
                    status: formData.status,
                    priority: formData.priority,
                    labels: formData.labels,
                    storyPoints: formData.storyPoints || null,
                    originalEstimate: formData.originalEstimate || null,
                    remainingEstimate: formData.remainingEstimate || null,
                },
                sessionUser?.id,
            );
            setIsCreateModalOpen(false);
            setRefreshKey((key) => key + 1);
            showToast("Task created.", "success");
        } catch (err) {
            showToast(err.message || "Unable to create the task.", "error");
        }
    };

    const handleUpdateTask = async (updated) => {
        try {
            const saved = await taskApi.update(updated.id, {
                title: updated.title,
                description: updated.description,
                status: updated.status,
                priority: updated.priority,
                labels: updated.labels,
                storyPoints: updated.storyPoints || null,
                originalEstimate: updated.originalEstimate || null,
                remainingEstimate: updated.remainingEstimate || null,
                ...(updated.assigneeEmail ? { assigneeEmail: updated.assigneeEmail } : {}),
            });
            // BE tra ban moi nhat: rut task ra khoi moi cot roi dat lai dung cot hien tai
            const patched = toCard(saved);
            setColumns((prev) => {
                const next = {};
                Object.keys(prev).forEach((status) => {
                    next[status] = prev[status].filter((task) => task.id !== patched.id);
                });
                next[patched.status] = [...(next[patched.status] || []), patched];
                return next;
            });
            setSelectedTask(null);
            showToast("Task updated.", "success");
        } catch (err) {
            showToast(err.message || "Unable to update the task.", "error");
        }
    };

    const handleArchiveTask = async (taskId) => {
        try {
            await taskApi.archive(taskId, true);
            setSelectedTask(null);
            setRefreshKey((key) => key + 1);
            showToast("Task archived.", "success");
        } catch (err) {
            showToast(err.message || "Unable to archive the task.", "error");
        }
    };

    // ----- Keo tha -----
    const handleDragStart = (event, task) => {
        setDragTaskId(task.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
    };

    const handleDragEnd = () => {
        setDragTaskId(null);
        setDropTarget(null);
        dragCounter.current = 0;
    };

    const handleDragOver = (event, status) => {
        if (!dragTaskId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(status);
    };

    const handleDrop = async (event, status) => {
        event.preventDefault();
        const taskId = dragTaskId;
        handleDragEnd();
        if (!taskId || !projectId) return;

        const sourceStatus = Object.keys(columns).find((key) =>
            columns[key].some((task) => task.id === taskId),
        );
        if (sourceStatus === status) return;

        const moved = columns[sourceStatus]?.find((task) => task.id === taskId);
        if (!moved) return;

        // Optimistic: chuyen card sang cot moi ngay, loi thi load lai tu BE
        setColumns((prev) => ({
            ...prev,
            [sourceStatus]: prev[sourceStatus].filter((task) => task.id !== taskId),
            [status]: [...prev[status], { ...moved, status }],
        }));

        try {
            await taskApi.move(taskId, { status, sortOrder: columns[status].length });
        } catch (err) {
            showToast(err.message || "Unable to move the task.", "error");
            setRefreshKey((key) => key + 1);
        }
    };

    if (!projectId) {
        return (
            <div className="vibe-kanban-page">
                <div className="kanban-state-row" role="alert">
                    Open a project first to see its Kanban board.
                </div>
            </div>
        );
    }

    return (
        <div className="vibe-kanban-page">
            {/* 1. Thanh dieu khien phia tren */}
            <div className="kanban-top-filter-bar">
                <div className="kanban-search-box">
                    <Search size={14} className="kanban-search-icon" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <CustomSelector
                    options={assigneeOptions}
                    value={assigneeFilter}
                    onChange={(value) => setAssigneeFilter(value)}
                    placeholder="All assignees"
                />

                <button
                    type="button"
                    className="btn-kanban-refresh"
                    title="Refresh"
                    onClick={() => setRefreshKey((key) => key + 1)}
                >
                    <RotateCw size={14} />
                </button>

                <div className="kanban-top-actions">
                    <button
                        type="button"
                        className="btn-kanban-workbench"
                        onClick={onOpenWorkbench}
                    >
                        <Terminal size={14} />
                        <span>Open Workbench</span>
                    </button>

                    <button
                        type="button"
                        className="btn-kanban-new-task"
                        onClick={() => {
                            setDefaultTargetStatus("BACKLOG");
                            setIsCreateModalOpen(true);
                        }}
                    >
                        <Plus size={15} />
                        <span>New Task</span>
                    </button>
                </div>
            </div>

            {loading && (
                <div className="kanban-state-row">
                    <Loader2 size={15} className="kanban-spin" />
                    <span>Loading board...</span>
                </div>
            )}

            {!loading && error && (
                <div className="kanban-state-row kanban-state-error" role="alert">
                    <span>{error}</span>
                    <button
                        type="button"
                        className="btn-kanban-refresh"
                        onClick={() => setRefreshKey((key) => key + 1)}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* 2. Bang 4 cot */}
            {!loading && !error && (
                <div className="kanban-board-scroll-area">
                    <div className="kanban-columns-container">
                        {COLUMN_META.map((meta) => {
                            const columnTasks = (columns[meta.status] || []).filter(matchesFilters);

                            return (
                                <div
                                    key={meta.status}
                                    className={`kanban-column-card ${
                                        dropTarget === meta.status ? "drop-target" : ""
                                    }`}
                                    onDragOver={(event) => handleDragOver(event, meta.status)}
                                    onDragLeave={() => setDropTarget(null)}
                                    onDrop={(event) => handleDrop(event, meta.status)}
                                >
                                    <div className="column-header-row">
                                        <div className="column-title-cluster">
                                            <span
                                                className={`status-color-dot ${meta.colorClass}`}
                                            />
                                            <strong>{meta.title}</strong>
                                            <span className="column-count-chip">
                                                {columnTasks.length}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-col-header-add"
                                            onClick={() => {
                                                setDefaultTargetStatus(meta.status);
                                                setIsCreateModalOpen(true);
                                            }}
                                            title={`Add task to ${meta.title}`}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    <div className="column-tasks-track">
                                        {columnTasks.length === 0 ? (
                                            <div className="column-empty-dashed-well">
                                                <span>No tasks</span>
                                            </div>
                                        ) : (
                                            columnTasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    className={`kanban-task-card ${
                                                        dragTaskId === task.id ? "dragging" : ""
                                                    }`}
                                                    draggable
                                                    onDragStart={(event) =>
                                                        handleDragStart(event, task)
                                                    }
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => setSelectedTask(task)}
                                                >
                                                    <div className="task-card-header-row">
                                                        <div className="task-drag-title-wrap">
                                                            <span className="task-drag-handle">
                                                                â ¿
                                                            </span>
                                                            <strong
                                                                className="task-title-text"
                                                                title={task.title}
                                                            >
                                                                {task.title}
                                                            </strong>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="btn-task-hover-edit"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTask(task);
                                                            }}
                                                        >
                                                            <Pencil size={11} />
                                                            <span>Edit</span>
                                                        </button>
                                                    </div>

                                                    <div className="task-badges-row">
                                                        <span
                                                            className={`task-priority-pill ${(
                                                                task.priority || "MEDIUM"
                                                            ).toLowerCase()}`}
                                                        >
                                                            {task.priorityLabel || task.priority}
                                                        </span>
                                                        {task.labels.map((label) => (
                                                            <span
                                                                key={label}
                                                                className="task-label-chip"
                                                            >
                                                                {label}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <div className="task-card-divider" />

                                                    <div className="task-card-bottom-line">
                                                        <div className="task-assignee-meta">
                                                            {task.assigneeName ? (
                                                                <>
                                                                    <div className="task-avatar-circle">
                                                                        {initialsOf(
                                                                            task.assigneeName,
                                                                        )}
                                                                    </div>
                                                                    <span className="task-assignee-name">
                                                                        {task.assigneeName}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="task-assignee-name">
                                                                    Unassigned
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="task-hash-id">
                                                            #{String(task.id).slice(-6)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-col-bottom-add"
                                        onClick={() => {
                                            setDefaultTargetStatus(meta.status);
                                            setIsCreateModalOpen(true);
                                        }}
                                    >
                                        <Plus size={14} />
                                        <span>Add task</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. Modal tao task */}
            <CreateTaskModal
                isOpen={isCreateModalOpen}
                initialStatus={defaultTargetStatus}
                members={members}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateTask}
            />

            {/* 4. Modal chi tiet task */}
            <DetailTaskModal
                isOpen={Boolean(selectedTask)}
                task={selectedTask}
                members={members}
                onClose={() => setSelectedTask(null)}
                onSave={handleUpdateTask}
                onArchive={handleArchiveTask}
            />
        </div>
    );
};

export default ProjectKanban;