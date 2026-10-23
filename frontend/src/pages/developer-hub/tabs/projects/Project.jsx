import { useState } from "react";
import { Folder, Search, Star, Play, Archive, ExternalLink, GitBranch } from "lucide-react";
import "./Project.css";

const PROJECTS_DATA = [
    {
        id: "dms-ai-hub",
        name: "DMS AI Hub",
        type: "Local Project",
        status: "Active",
        tasks: 0,
        members: 1,
        pinned: true,
    },
    {
        id: "aivibecode",
        name: "aivibecode",
        type: "Local Project",
        status: "Idle",
        tasks: 0,
        members: 1,
        pinned: true,
    },
    {
        id: "about-vibeflow",
        name: "About Vibeflow",
        type: "Local Project",
        status: "Idle",
        tasks: 0,
        members: 1,
        pinned: true,
    },
    {
        id: "jira-skill",
        name: "jira-skill",
        type: "Local Project",
        status: "Idle",
        tasks: 0,
        members: 1,
        pinned: true,
    },
    {
        id: "webapp",
        name: "WebApp",
        type: "Local Project",
        status: "Idle",
        tasks: 1,
        members: 1,
        pinned: false,
    },
    {
        id: "shoestore",
        name: "ShoeStore",
        type: "Local Project",
        status: "Idle",
        tasks: 2,
        members: 5,
        pinned: false,
    },
    {
        id: "overview",
        name: "Overview",
        type: "Local Project",
        status: "Idle",
        tasks: 4,
        members: 3,
        pinned: false,
    },
    {
        id: "fastapi",
        name: "FastAPI",
        type: "Local Project",
        status: "Idle",
        tasks: 0,
        members: 1,
        pinned: false,
    },
    {
        id: "nicho-jpro-fe",
        name: "Nicho-JPRO-FE",
        type: "dev.azure.com/Jarvis-DataOps/NvidiaTeam/_git/...",
        status: "Idle",
        tasks: 0,
        members: 9,
        pinned: false,
        isRemote: true,
    },
];

const Project = ({ onOpenProject }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Active");
    const [sortOption, setSortOption] = useState("Recently updated");

    const filteredProjects = PROJECTS_DATA.filter((p) => {
        const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
            statusFilter === "All" || p.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesQuery && matchesStatus;
    });

    return (
        <div className="vibe-projects-viewport">
            {/* Header Title */}
            <div className="projects-catalog-header">
                <h2>Projects</h2>
                <span className="projects-total-count">{PROJECTS_DATA.length} projects</span>
            </div>

            {/* Filter Bar Controls */}
            <div className="projects-catalog-controls">
                <div className="search-pill-container">
                    <Search size={14} className="search-glyph-muted" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="dropdown-pill-group">
                    <select
                        className="filter-select-pill"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="Active">Active</option>
                        <option value="Idle">Idle</option>
                        <option value="All">All Status</option>
                    </select>

                    <select
                        className="filter-select-pill"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                    >
                        <option value="Recently updated">Recently updated</option>
                        <option value="Name">Name A-Z</option>
                    </select>
                </div>
            </div>

            {/* Grid 3 Columns */}
            <div className="projects-catalog-grid">
                {filteredProjects.map((project) => (
                    <div key={project.id} className="project-entity-card">
                        {/* Hàng 1: Icon thư mục, tên dự án, icon sao, lưu trữ & trạng thái */}
                        <div className="entity-card-top">
                            <div className="entity-title-cluster">
                                <Folder size={17} className="entity-folder-glyph" />
                                <strong title={project.name}>{project.name}</strong>
                            </div>

                            <div className="entity-badges-cluster">
                                {project.pinned ? (
                                    <Star size={13} className="glyph-star-pinned" />
                                ) : (
                                    <Star size={13} className="glyph-star-muted" />
                                )}
                                <Archive size={13} className="glyph-archive-muted" />
                                <span
                                    className={`entity-status-tag ${project.status.toLowerCase()}`}
                                >
                                    {project.status === "Active" ? (
                                        <Play size={9} fill="currentColor" />
                                    ) : (
                                        "○"
                                    )}
                                    <span>{project.status}</span>
                                </span>
                            </div>
                        </div>

                        {/* Hàng 2: Local Project hoặc Link Git Azure */}
                        <div className="entity-type-row">
                            {project.isRemote ? (
                                <span className="remote-git-link" title={project.type}>
                                    <GitBranch size={12} />
                                    <span>{project.type}</span>
                                    <ExternalLink size={10} className="external-link-glyph" />
                                </span>
                            ) : (
                                <span className="local-project-label">{project.type}</span>
                            )}
                        </div>

                        {/* Hàng 3: Thống kê số task & members */}
                        <div className="entity-stats-row">
                            <span>
                                {project.tasks} {project.tasks === 1 ? "task" : "tasks"}
                            </span>
                            <span>
                                {project.members} {project.members === 1 ? "member" : "members"}
                            </span>
                        </div>

                        {/* Hàng 4: Nút Open Project bo góc mềm */}
                        <button
                            type="button"
                            className="btn-open-project-pill"
                            onClick={() => onOpenProject && onOpenProject(project)}
                        >
                            Open Project
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Project;
