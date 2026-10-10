import { useState } from "react";
import { Search, RotateCw, Archive, ExternalLink, ListTodo } from "lucide-react";
import "./Task.css";

const TASKS_DATA = [
    { id: "t1", status: "Backlog", task: "Main", project: "ShoeStore", updated: "Oct 9, 02:12 PM" },
    {
        id: "t2",
        status: "Backlog",
        task: "Tạo reuire",
        project: "ShoeStore",
        updated: "Oct 9, 02:12 PM",
    },
    {
        id: "t3",
        status: "Backlog",
        task: "Main",
        project: "Hanh's Private Workspace",
        updated: "Oct 9, 10:13 AM",
    },
    { id: "t4", status: "Backlog", task: "Main", project: "ShoeStore", updated: "Oct 8, 03:27 PM" },
    { id: "t5", status: "Backlog", task: "hihi", project: "ShoeStore", updated: "Oct 8, 08:53 AM" },
    { id: "t6", status: "Backlog", task: "Main", project: "ShoeStore", updated: "Oct 7, 04:16 PM" },
    { id: "t7", status: "Backlog", task: "Main", project: "ShoeStore", updated: "Oct 7, 02:40 PM" },
    { id: "t8", status: "Backlog", task: "Main", project: "WebApp", updated: "Oct 7, 01:41 PM" },
    { id: "t9", status: "Backlog", task: "Main", project: "ShoeStore", updated: "Oct 7, 01:25 PM" },
    {
        id: "t10",
        status: "Backlog",
        task: "Main",
        project: "ShoeStore",
        updated: "Oct 7, 01:25 PM",
    },
    {
        id: "t11",
        status: "Backlog",
        task: "Main",
        project: "ShoeStore",
        updated: "Oct 7, 01:25 PM",
    },
];

const Task = ({ onOpenTask }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Active");

    const filteredTasks = TASKS_DATA.filter((item) => {
        const matchesSearch =
            item.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.project.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="vibe-tasks-viewport">
            {/* Header hàng trên */}
            <div className="tasks-top-banner">
                <div className="banner-title-col">
                    <h2>Your tasks</h2>
                    <span>99 tasks across all your projects.</span>
                </div>
                <button type="button" className="btn-refresh-task" title="Refresh">
                    <RotateCw size={15} />
                </button>
            </div>

            {/* Bộ điều khiển lọc */}
            <div className="tasks-filter-bar">
                <div className="search-pill-container">
                    <Search size={14} className="search-glyph-muted" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    className="filter-select-pill"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                    <option value="All">All</option>
                </select>
            </div>

            {/* Bảng dữ liệu Tasks */}
            <div className="tasks-table-wrapper">
                <table className="vibe-task-table">
                    <thead>
                        <tr>
                            <th className="th-status">Status ⇕</th>
                            <th className="th-task">Task ⇕</th>
                            <th className="th-project">Project ⇕</th>
                            <th className="th-updated">Updated ▾</th>
                            <th className="th-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.map((row) => (
                            <tr
                                key={row.id}
                                className="task-table-row"
                                onClick={() => onOpenTask && onOpenTask(row)}
                            >
                                {/* Cột Status */}
                                <td className="td-status">
                                    <span className="task-backlog-badge">{row.status}</span>
                                </td>

                                {/* Cột Task Name */}
                                <td className="td-task">
                                    <div className="task-title-cell">
                                        <ListTodo size={14} className="task-icon-glyph" />
                                        <strong title={row.task}>{row.task}</strong>
                                    </div>
                                </td>

                                {/* Cột Project */}
                                <td className="td-project">
                                    <span>{row.project}</span>
                                </td>

                                {/* Cột Updated Time */}
                                <td className="td-updated">
                                    <span>{row.updated}</span>
                                </td>

                                {/* Cột Actions */}
                                <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                                    <div className="actions-cluster">
                                        <button
                                            type="button"
                                            className="btn-action-glyph"
                                            title="Archive task"
                                        >
                                            <Archive size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-action-glyph"
                                            title="Open task details"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Task;
