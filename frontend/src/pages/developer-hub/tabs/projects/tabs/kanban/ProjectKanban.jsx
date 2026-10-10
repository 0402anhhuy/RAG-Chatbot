import { useState } from "react";
import { Search, Plus, Terminal, Pencil } from "lucide-react";
import CreateTaskModal from "../../components/modals/kanban-task/CreateTaskModal";
import DetailTaskModal from "../../components/modals/kanban-task/DetailTaskModal";
import "./ProjectKanban.css";

const INITIAL_COLUMNS = [
    {
        id: "backlog",
        title: "Backlog",
        colorClass: "dot-backlog",
        tasks: [
            {
                id: "2b6a06",
                title: "sdfsad",
                priority: "Medium",
                assignee: "Huy Tran Anh",
                description: "",
                labels: [],
                storyPoints: "",
                originalEstimate: "3w 4d 12h",
                remainingEstimate: "3w 4d 12h",
                status: "backlog",
            },
        ],
    },
    {
        id: "in_progress",
        title: "In Progress",
        colorClass: "dot-in-progress",
        tasks: [],
    },
    {
        id: "review",
        title: "Review",
        colorClass: "dot-review",
        tasks: [],
    },
    {
        id: "completed",
        title: "Completed",
        colorClass: "dot-completed",
        tasks: [],
    },
];

const ProjectKanban = ({ onOpenWorkbench }) => {
    const [columns, setColumns] = useState(INITIAL_COLUMNS);
    const [searchQuery, setSearchQuery] = useState("");
    const [assigneeFilter, setAssigneeFilter] = useState("all");

    // Modal Tạo Mới
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [defaultTargetStatus, setDefaultTargetStatus] = useState("backlog");

    // Modal Chỉnh Sửa
    const [selectedEditTask, setSelectedEditTask] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleOpenCreateModal = (columnId = "backlog") => {
        setDefaultTargetStatus(columnId);
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (task) => {
        setSelectedEditTask(task);
        setIsEditModalOpen(true);
    };

    // Tạo Task Mới
    const handleCreateTask = (newTaskData) => {
        const targetColId = newTaskData.status || defaultTargetStatus;

        setColumns((prevCols) =>
            prevCols.map((col) => {
                if (col.id === targetColId) {
                    return {
                        ...col,
                        tasks: [
                            ...col.tasks,
                            {
                                ...newTaskData,
                                id: newTaskData.id || `task-${Date.now()}`,
                                assignee: newTaskData.assignee || "Huy Tran Anh",
                                priority: newTaskData.priority || "Medium",
                            },
                        ],
                    };
                }
                return col;
            }),
        );
    };

    // Cập Nhật Task Sau Khi Sửa
    const handleUpdateTask = (updatedTask) => {
        setColumns((prevCols) =>
            prevCols.map((col) => {
                // Kiểm tra xem task này có đổi trạng thái cột không
                const existsInCol = col.tasks.some((t) => t.id === updatedTask.id);

                if (col.id === updatedTask.status) {
                    if (existsInCol) {
                        return {
                            ...col,
                            tasks: col.tasks.map((t) =>
                                t.id === updatedTask.id ? updatedTask : t,
                            ),
                        };
                    } else {
                        return {
                            ...col,
                            tasks: [...col.tasks, updatedTask],
                        };
                    }
                } else if (existsInCol) {
                    // Xoá khỏi cột cũ nếu đã chuyển sang cột khác
                    return {
                        ...col,
                        tasks: col.tasks.filter((t) => t.id !== updatedTask.id),
                    };
                }
                return col;
            }),
        );
    };

    // Lưu Trữ (Archive) Task
    const handleArchiveTask = (taskId) => {
        setColumns((prevCols) =>
            prevCols.map((col) => ({
                ...col,
                tasks: col.tasks.filter((t) => t.id !== taskId),
            })),
        );
    };

    return (
        <div className="vibe-kanban-page">
            {/* 1. Thanh điều khiển phía trên bảng Kanban */}
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

                <select
                    className="kanban-assignee-select"
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                >
                    <option value="all">All assignees</option>
                    <option value="me">Assigned to me</option>
                </select>

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
                        onClick={() => handleOpenCreateModal("backlog")}
                    >
                        <Plus size={15} />
                        <span>New Task</span>
                    </button>
                </div>
            </div>

            {/* 2. Bảng 4 Cột Kanban */}
            <div className="kanban-board-scroll-area">
                <div className="kanban-columns-container">
                    {columns.map((col) => {
                        const filteredTasks = col.tasks.filter((t) =>
                            t.title.toLowerCase().includes(searchQuery.toLowerCase()),
                        );

                        return (
                            <div key={col.id} className="kanban-column-card">
                                {/* Header Cột */}
                                <div className="column-header-row">
                                    <div className="column-title-cluster">
                                        <span className={`status-color-dot ${col.colorClass}`} />
                                        <strong>{col.title}</strong>
                                        <span className="column-count-chip">
                                            {filteredTasks.length}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-col-header-add"
                                        onClick={() => handleOpenCreateModal(col.id)}
                                        title={`Add task to ${col.title}`}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                {/* Danh sách Task */}
                                <div className="column-tasks-track">
                                    {filteredTasks.length === 0 ? (
                                        <div className="column-empty-dashed-well">
                                            <span>No tasks</span>
                                        </div>
                                    ) : (
                                        filteredTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="kanban-task-card"
                                                onClick={() => handleOpenEditModal(task)}
                                            >
                                                {/* Header Task: Icon drag, Tiêu đề và nút Edit khi hover */}
                                                <div className="task-card-header-row">
                                                    <div className="task-drag-title-wrap">
                                                        <span className="task-drag-handle">⠿</span>
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
                                                            handleOpenEditModal(task);
                                                        }}
                                                    >
                                                        <Pencil size={11} />
                                                        <span>Edit</span>
                                                    </button>
                                                </div>

                                                {/* Badge Priority */}
                                                <div className="task-badges-row">
                                                    <span
                                                        className={`task-priority-pill ${(task.priority || "Medium").toLowerCase()}`}
                                                    >
                                                        {task.priority || "Medium"}
                                                    </span>
                                                </div>

                                                <div className="task-card-divider" />

                                                {/* Footer Task: Avatar, Tên Assignee & Mã Hash */}
                                                <div className="task-card-bottom-line">
                                                    <div className="task-assignee-meta">
                                                        <div className="task-avatar-circle">
                                                            {(task.assignee || "HT")
                                                                .slice(0, 2)
                                                                .toUpperCase()}
                                                        </div>
                                                        <span className="task-assignee-name">
                                                            {task.assignee || "Huy Tran Anh"}
                                                        </span>
                                                    </div>
                                                    <span className="task-hash-id">
                                                        #{String(task.id).slice(-6)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Nút Add task ở chân cột */}
                                <button
                                    type="button"
                                    className="btn-col-bottom-add"
                                    onClick={() => handleOpenCreateModal(col.id)}
                                >
                                    <Plus size={14} />
                                    <span>Add task</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. Modal Tạo Task mới */}
            <CreateTaskModal
                isOpen={isCreateModalOpen}
                initialStatus={defaultTargetStatus}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateTask}
            />

            {/* 4. Modal Chỉnh Sửa Task */}
            <DetailTaskModal
                isOpen={isEditModalOpen}
                task={selectedEditTask}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedEditTask(null);
                }}
                onSave={handleUpdateTask}
                onArchive={handleArchiveTask}
            />
        </div>
    );
};

export default ProjectKanban;
