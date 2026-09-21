import { useState } from "react";
import { Folder, Search, Star } from "lucide-react";
import "./Project.css";

const PROJECTS_MOCK = [
    {
        id: "dmsaihub",
        name: "dmsaihub",
        type: "Local Project",
        tasks: 0,
        members: 1,
        status: "Idle",
    },
    {
        id: "huy_workspace",
        name: "Huy's Private Workspace",
        type: "Local Project",
        tasks: 0,
        members: 1,
        status: "Idle",
    },
];

const Project = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("active");

    const filteredProjects = PROJECTS_MOCK.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <div className="tab-body-container">
            <div className="tab-header-banner">
                <h2>Projects</h2>
                <span>{PROJECTS_MOCK.length} projects</span>
            </div>

            <div className="filter-controls-bar">
                <div className="filter-search-box">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="filter-dropdown-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            <div className="projects-cards-grid">
                {filteredProjects.map((p) => (
                    <div key={p.id} className="project-surface-card">
                        <div className="card-top-row">
                            <div className="card-project-identity">
                                <Folder size={16} className="folder-icon" />
                                <strong>{p.name}</strong>
                            </div>
                            <div className="card-top-actions">
                                <Star size={14} className="star-icon" />
                                <span className="status-idle-pill">{p.status}</span>
                            </div>
                        </div>
                        <span className="project-type-label">{p.type}</span>
                        <span className="project-sub-meta">
                            {p.tasks} tasks · {p.members} member
                        </span>
                        <button type="button" className="btn-open-project">
                            Open Project
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Project;
