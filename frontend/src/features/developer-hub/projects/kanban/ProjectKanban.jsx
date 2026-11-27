import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, Loader2, Pencil, Plus, RotateCw, Search, Terminal } from "lucide-react";
import { kanbanApi, taskApi } from "@/api";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import CreateTaskModal from "@/features/developer-hub/projects/modals/kanban-task/CreateTaskModal.jsx";
import DetailTaskModal from "@/features/developer-hub/projects/modals/kanban-task/DetailTaskModal.jsx";
import "@/features/developer-hub/projects/kanban/ProjectKanban.css";
import { getSessionUser } from "@/lib/session";
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
    const [searchQuery, setSearchQuery] = useState("");
    const [assigneeFilter, setAssigneeFilter] = useState("all");
    const [dragPreview, setDragPreview] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [defaultTargetStatus, setDefaultTargetStatus] = useState("BACKLOG");
    const [selectedTask, setSelectedTask] = useState(null);
    const dragEndedAt = useRef(0);

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

    const { loading, error, reload } = useAsyncData(
        () => kanbanApi.getBoard(projectId),
        [projectId],
        {
            enabled: Boolean(projectId),
            onSuccess: applyBoard,
            errorMessage: "Unable to load the board.",
            onError: () => {
                setColumns({});
                setMembers([]);
            },
        },
    );

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
            reload();
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
            reload();
            showToast("Task archived.", "success");
        } catch (err) {
            showToast(err.message || "Unable to archive the task.", "error");
        }
    };

    // ----- Kéo thả bằng pointer event: thẻ bay theo con trỏ, thẻ gốc thành ô ghost -----
    const resetDrag = () => {
        setDragPreview(null);
        setDropTarget(null);
        document.body.classList.remove("kanban-dragging");
    };

    useEffect(() => () => document.body.classList.remove("kanban-dragging"), []);

    // Cột + vị trí chèn suy ra từ toạ độ con trỏ (dùng DOM đang render, đúng cả khi có filter)
    const resolveDropSpot = (clientX, clientY) => {
        const columnEl = document
            .elementFromPoint(clientX, clientY)
            ?.closest("[data-drop-status]");
        if (!columnEl) return null;

        const cards = Array.from(columnEl.querySelectorAll("[data-task-id]"));
        let index = cards.length;
        for (let i = 0; i < cards.length; i += 1) {
            const rect = cards[i].getBoundingClientRect();
            if (clientY < rect.top + rect.height / 2) {
                index = i;
                break;
            }
        }

        return {
            status: columnEl.dataset.dropStatus,
            index,
            trackEl: columnEl.querySelector("[data-drop-track]"),
        };
    };

    // Dịch vị trí thả (theo danh sách đang hiển thị) sang danh sách đầy đủ của cột
    const buildTargetOrder = (task, toStatus, index) => {
        const fullColumn = columns[toStatus] || [];
        const visibleColumn = fullColumn.filter(matchesFilters);
        const anchorId = visibleColumn[index]?.id ?? null;
        if (anchorId === task.id) return null;

        const withoutTask = fullColumn.filter((item) => item.id !== task.id);
        let insertAt = withoutTask.length;
        if (anchorId) {
            const anchorIndex = withoutTask.findIndex((item) => item.id === anchorId);
            if (anchorIndex >= 0) insertAt = anchorIndex;
        }

        const order = withoutTask.map((item) => item.id);
        order.splice(insertAt, 0, task.id);
        return { insertAt, order };
    };

    const commitMove = async (task, fromStatus, toStatus, index) => {
        if (!projectId) return;
        const target = buildTargetOrder(task, toStatus, index);
        if (!target) return;

        const currentOrder = (columns[toStatus] || []).map((item) => item.id);
        const isSameOrder =
            fromStatus === toStatus &&
            currentOrder.length === target.order.length &&
            currentOrder.every((id, i) => id === target.order[i]);
        if (isSameOrder) return;

        // Optimistic: đặt thẻ vào đúng chỗ vừa thả, lỗi thì tải lại từ BE
        setColumns((prev) => {
            const moving = prev[fromStatus]?.find((item) => item.id === task.id) || task;
            const source = (prev[fromStatus] || []).filter((item) => item.id !== task.id);
            const destination = (prev[toStatus] || []).filter((item) => item.id !== task.id);
            destination.splice(Math.min(target.insertAt, destination.length), 0, {
                ...moving,
                status: toStatus,
            });
            if (fromStatus === toStatus) return { ...prev, [toStatus]: destination };
            return { ...prev, [fromStatus]: source, [toStatus]: destination };
        });

        try {
            if (fromStatus !== toStatus) {
                await taskApi.move(task.id, { status: toStatus, sortOrder: target.insertAt });
            }
            await taskApi.reorder(projectId, toStatus, target.order);
        } catch (err) {
            showToast(err.message || "Unable to move the task.", "error");
            reload();
        }
    };

    const handleCardPointerDown = (event, task, fromStatus) => {
        if (event.button !== 0 || event.target.closest("button")) return;

        const cardRect = event.currentTarget.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const grabX = startX - cardRect.left;
        const grabY = startY - cardRect.top;
        let isDragging = false;
        let lastSpot = null;

        const handleMove = (moveEvent) => {
            if (!isDragging) {
                const travelled = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
                if (travelled < 5) return;
                isDragging = true;
                document.body.classList.add("kanban-dragging");
            }

            setDragPreview({
                task,
                x: moveEvent.clientX,
                y: moveEvent.clientY,
                grabX,
                grabY,
                width: cardRect.width,
            });

            const spot = resolveDropSpot(moveEvent.clientX, moveEvent.clientY);
            lastSpot = spot;
            setDropTarget(spot ? { status: spot.status, index: spot.index } : null);

            // Tự cuộn cột đang trỏ tới khi kéo sát mép trên/dưới
            if (spot?.trackEl) {
                const trackRect = spot.trackEl.getBoundingClientRect();
                if (moveEvent.clientY < trackRect.top + 52) spot.trackEl.scrollTop -= 14;
                else if (moveEvent.clientY > trackRect.bottom - 52) spot.trackEl.scrollTop += 14;
            }
        };

        const handleUp = () => {
            detach();
            if (isDragging) {
                dragEndedAt.current = Date.now();
                if (lastSpot) commitMove(task, fromStatus, lastSpot.status, lastSpot.index);
            }
            resetDrag();
        };

        const handleCancel = () => {
            detach();
            resetDrag();
        };

        const handleKeyDown = (keyEvent) => {
            if (keyEvent.key === "Escape") handleCancel();
        };

        const detach = () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
            window.removeEventListener("pointercancel", handleCancel);
            window.removeEventListener("keydown", handleKeyDown);
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleCancel);
        window.addEventListener("keydown", handleKeyDown);
    };

    const openTaskDetails = (task) => {
        // Bỏ qua cú click phát sinh ngay sau khi thả thẻ
        if (Date.now() - dragEndedAt.current < 250) return;
        setSelectedTask(task);
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
                    data-tooltip="Refresh"
                    onClick={reload}
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
                        onClick={reload}
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
                                    data-drop-status={meta.status}
                                    className={`kanban-column-card ${
                                        dropTarget?.status === meta.status ? "is-drop-target" : ""
                                    }`}
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
                                            data-tooltip={`Add task to ${meta.title}`}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    <div className="column-tasks-track" data-drop-track={meta.status}>
                                        {columnTasks.length === 0 ? (
                                            <div
                                                className={`column-empty-dashed-well ${
                                                    dropTarget?.status === meta.status
                                                        ? "is-drop-active"
                                                        : ""
                                                }`}
                                            >
                                                <span>
                                                    {dropTarget?.status === meta.status
                                                        ? "Drop the task here"
                                                        : "No tasks"}
                                                </span>
                                            </div>
                                        ) : (
                                            columnTasks.map((task, taskIndex) => (
                                                <Fragment key={task.id}>
                                                    {dropTarget?.status === meta.status &&
                                                        dropTarget.index === taskIndex && (
                                                            <div
                                                                className="kanban-drop-line"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    <div
                                                        data-task-id={task.id}
                                                        className={`kanban-task-card ${
                                                            dragPreview?.task.id === task.id
                                                                ? "is-drag-ghost"
                                                                : ""
                                                        }`}
                                                        onPointerDown={(event) =>
                                                            handleCardPointerDown(
                                                                event,
                                                                task,
                                                                meta.status,
                                                            )
                                                        }
                                                        onClick={() => openTaskDetails(task)}
                                                    >
                                                        <div className="task-card-header-row">
                                                            <div className="task-drag-title-wrap">
                                                                <span className="task-drag-handle">
                                                                    <GripVertical size={13} />
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
                                                </Fragment>
                                            ))
                                        )}
                                        {columnTasks.length > 0 &&
                                            dropTarget?.status === meta.status &&
                                            dropTarget.index >= columnTasks.length && (
                                                <div
                                                    className="kanban-drop-line"
                                                    aria-hidden="true"
                                                />
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
                project={project}
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

            {/* 5. Thẻ bay theo con trỏ trong lúc kéo */}
            {dragPreview &&
                createPortal(
                    <div
                        className="kanban-drag-preview"
                        style={{
                            width: dragPreview.width,
                            transform: `translate3d(${dragPreview.x - dragPreview.grabX}px, ${
                                dragPreview.y - dragPreview.grabY
                            }px, 0)`,
                        }}
                    >
                        <GripVertical size={14} className="kanban-drag-preview-grip" />
                        <strong className="kanban-drag-preview-title">
                            {dragPreview.task.title}
                        </strong>
                        <span
                            className={`task-priority-pill ${(
                                dragPreview.task.priority || "MEDIUM"
                            ).toLowerCase()}`}
                        >
                            {dragPreview.task.priorityLabel || dragPreview.task.priority}
                        </span>
                    </div>,
                    document.body,
                )}
        </div>
    );
};

export default ProjectKanban;