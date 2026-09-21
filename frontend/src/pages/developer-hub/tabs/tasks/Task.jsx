import { useState } from "react";
import { ExternalLink, Search, Trash2 } from "lucide-react";
import "./Task.css";

const TASKS_DATA = [
    { id: 1, task: "Main", project: "dmsaihub", updated: "Sep 15, 09:03 AM" },
    { id: 2, task: "Main", project: "dmsaihub", updated: "Sep 15, 09:02 AM" },
    { id: 3, task: "Main", project: "Huy's Private Workspace", updated: "Sep 11, 03:40 PM" },
    { id: 4, task: "Main", project: "DMS_Portal", updated: "Aug 26, 05:07 PM" },
    { id: 5, task: "Main", project: "DMS_FastAPI", updated: "Aug 24, 03:21 PM" },
];

const Task = () => {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="tab-body-container">
            <div className="tab-header-banner">
                <h2>Your tasks</h2>
                <span>{TASKS_DATA.length} tasks across all your projects</span>
            </div>

            <div className="filter-controls-bar">
                <div className="filter-search-box">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-responsive-wrapper">
                <table className="vibe-records-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Task</th>
                            <th>Project</th>
                            <th>Updated</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TASKS_DATA.map((t) => (
                            <tr key={t.id}>
                                <td>
                                    <span className="table-backlog-badge">Backlog</span>
                                </td>
                                <td>
                                    <strong>{t.task}</strong>
                                </td>
                                <td>
                                    <code>{t.project}</code>
                                </td>
                                <td>{t.updated}</td>
                                <td className="actions-cell">
                                    <Trash2 size={14} className="action-row-glyph danger" />
                                    <ExternalLink size={14} className="action-row-glyph" />
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
