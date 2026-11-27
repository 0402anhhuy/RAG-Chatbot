import { useMemo, useState } from "react";
import {
    RotateCw,
    Archive,
    ExternalLink,
    ListTodo,
    ArchiveRestore,
    ChevronsUpDown,
} from "lucide-react";
import { taskApi } from "@/api";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import SearchPill from "@/components/ui/SearchPill.jsx";
import "@/features/developer-hub/tasks/Task.css";
import { getSessionUserId } from "@/lib/session";


// Bộ lọc Active / Archived / All dùng CustomSelector chung của hệ thống
const STATUS_FILTER_OPTIONS = [
    { value: "Active", label: "Active", color: "green" },
    { value: "Archived", label: "Archived", color: "amber" },
    { value: "All", label: "All", color: "blue" },
];

// Truyền thẳng trạng thái xuống BE để lọc (null = không lọc)
const toArchivedParam = (filter) => {
    if (filter === "Active") return false;
    if (filter === "Archived") return true;
    return undefined;
};

const Task = ({ onOpenTask }) => {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Active");
    const [pendingTaskId, setPendingTaskId] = useState(null);

    // Debounce tìm kiếm để không gọi API trên mỗi lần gõ phím
    const { data: tasks, setData: setTasks, loading, error } = useAsyncData(
        () =>
            taskApi.list({
                ownerId: getSessionUserId(),
                archived: toArchivedParam(statusFilter),
                search: searchQuery.trim() || undefined,
            }),
        [searchQuery, statusFilter],
        { initialData: [], debounceMs: 250, errorMessage: "Unable to load tasks." },
    );

    const toggleArchived = async (task) => {
        try {
            setPendingTaskId(task.id);
            const updated = await taskApi.archive(task.id, !task.archived);
            setTasks((prev) => {
                // Đang xem Active/Archived thì dòng vừa đổi trạng thái phải biến khỏi danh sách
                if (statusFilter !== "All") {
                    return prev.filter((item) => item.id !== updated.id);
                }
                return prev.map((item) => (item.id === updated.id ? updated : item));
            });
            showToast(updated.archived ? "Task archived." : "Task restored.", "success");
        } catch (err) {
            showToast(err.message || "Unable to update task.", "error");
        } finally {
            setPendingTaskId(null);
        }
    };

    const totalLabel = useMemo(() => {
        const count = tasks.length;
        return `${count} ${count === 1 ? "task" : "tasks"} ${
            statusFilter === "Archived" ? "archived" : "across all your projects"
        }.`;
    }, [tasks.length, statusFilter]);

    return (
        <div className="vibe-tasks-viewport">
            {/* Header hàng trên */}
            <div className="tasks-top-banner">
                <div className="banner-title-col">
                    <h2>Your tasks</h2>
                    <span>{totalLabel}</span>
                </div>
                <button
                    type="button"
                    className="btn-refresh-task"
                    title="Refresh"
                    onClick={() => setRefreshKey((key) => key + 1)}
                >
                    <RotateCw size={15} />
                </button>
            </div>

            {/* Bộ điều khiển lọc */}
            <div className="tasks-filter-bar">
                <SearchPill
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search tasks..."
                />

                <CustomSelector
                    options={STATUS_FILTER_OPTIONS}
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value)}
                    placeholder="Filter status..."
                />
            </div>

            {loading && <p className="tasks-state-text">Loading tasks...</p>}
            {!loading && error && (
                <p role="alert" className="tasks-state-text tasks-state-error">
                    {error}
                </p>
            )}

            {/* Bảng dữ liệu Tasks */}
            {!loading && !error && (
                <div className="tasks-table-wrapper">
                    <table className="vibe-task-table">
                        <thead>
                            <tr>
                                <th className="th-status">
                                    <span className="th-sort-label">
                                        Status
                                        <ChevronsUpDown size={12} className="th-sort-icon" />
                                    </span>
                                </th>
                                <th className="th-task">
                                    <span className="th-sort-label">
                                        Task
                                        <ChevronsUpDown size={12} className="th-sort-icon" />
                                    </span>
                                </th>
                                <th className="th-project">
                                    <span className="th-sort-label">
                                        Project
                                        <ChevronsUpDown size={12} className="th-sort-icon" />
                                    </span>
                                </th>
                                <th className="th-updated">
                                    <span className="th-sort-label">
                                        Updated
                                        <ChevronsUpDown size={12} className="th-sort-icon" />
                                    </span>
                                </th>
                                <th className="th-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="tasks-empty-cell">
                                        No tasks found.
                                    </td>
                                </tr>
                            ) : (
                                tasks.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`task-table-row ${
                                            row.archived ? "is-archived" : ""
                                        }`}
                                        onClick={() => onOpenTask && onOpenTask(row)}
                                    >
                                        {/* Cột Status */}
                                        <td className="td-status">
                                            <span
                                                className={`task-backlog-badge status-${(
                                                    row.status || ""
                                                ).toLowerCase()}`}
                                            >
                                                {row.statusLabel || row.status}
                                            </span>
                                        </td>

                                        {/* Cột Task Name */}
                                        <td className="td-task">
                                            <div className="task-title-cell">
                                                <ListTodo size={14} className="task-icon-glyph" />
                                                <strong title={row.title}>{row.title}</strong>
                                            </div>
                                        </td>

                                        {/* Cột Project */}
                                        <td className="td-project">
                                            <span>{row.projectName || "—"}</span>
                                        </td>

                                        {/* Cột Updated Time */}
                                        <td className="td-updated">
                                            <span>{row.updatedAtLabel || "—"}</span>
                                        </td>

                                        {/* Cột Actions */}
                                        <td
                                            className="td-actions"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="actions-cluster">
                                                <button
                                                    type="button"
                                                    className="btn-action-glyph"
                                                    title={
                                                        row.archived
                                                            ? "Restore task"
                                                            : "Archive task"
                                                    }
                                                    disabled={pendingTaskId === row.id}
                                                    onClick={() => toggleArchived(row)}
                                                >
                                                    {row.archived ? (
                                                        <ArchiveRestore size={14} />
                                                    ) : (
                                                        <Archive size={14} />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action-glyph"
                                                    title="Open task details"
                                                    onClick={() => onOpenTask && onOpenTask(row)}
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Task;
