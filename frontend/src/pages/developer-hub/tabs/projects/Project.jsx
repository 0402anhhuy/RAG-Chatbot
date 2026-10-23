import { useEffect, useMemo, useState } from "react";
import { Folder, Search, Star, Play, Archive, ExternalLink, GitBranch } from "lucide-react";
import { projectApi } from "../../../../api";
import "./Project.css";

const getOwnerId = () => {
    try {
        return JSON.parse(localStorage.getItem("rag_session") || "{}")?.user?.id;
    } catch {
        return null;
    }
};

const toProjectViewModel = (project) => ({
    ...project,
    type: project.type === "REMOTE" ? project.repositoryUrl || "Remote Repository" : "Local Project",
    status: project.status === "ACTIVE" ? "Active" : project.status === "ARCHIVED" ? "Archived" : "Idle",
    isRemote: project.type === "REMOTE",
});

const Project = ({ onOpenProject, refreshKey = 0 }) => {
    const [projects, setProjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Active");
    const [sortOption, setSortOption] = useState("Recently updated");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        const loadProjects = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await projectApi.list({ ownerId: getOwnerId() });
                if (!cancelled) setProjects((data || []).map(toProjectViewModel));
            } catch (err) {
                if (!cancelled) setError(err.message || "Unable to load projects.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadProjects();
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    const filteredProjects = useMemo(() => {
        return projects
            .filter((project) => {
                const matchesQuery = project.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus =
                    statusFilter === "All" || project.status.toLowerCase() === statusFilter.toLowerCase();
                return matchesQuery && matchesStatus;
            })
            .sort((first, second) =>
                sortOption === "Name"
                    ? first.name.localeCompare(second.name)
                    : new Date(second.updatedAt || 0) - new Date(first.updatedAt || 0),
            );
    }, [projects, searchQuery, sortOption, statusFilter]);

    return (
        <div className="vibe-projects-viewport">
            <div className="projects-catalog-header">
                <h2>Projects</h2>
                <span className="projects-total-count">{projects.length} projects</span>
            </div>

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
                    <select className="filter-select-pill" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Idle">Idle</option>
                        <option value="All">All Status</option>
                    </select>
                    <select className="filter-select-pill" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                        <option value="Recently updated">Recently updated</option>
                        <option value="Name">Name A-Z</option>
                    </select>
                </div>
            </div>

            {loading && <p>Loading projects...</p>}
            {!loading && error && <p role="alert">{error}</p>}
            {!loading && !error && filteredProjects.length === 0 && <p>No projects found.</p>}

            <div className="projects-catalog-grid">
                {filteredProjects.map((project) => (
                    <div key={project.id} className="project-entity-card">
                        <div className="entity-card-top">
                            <div className="entity-title-cluster">
                                <Folder size={17} className="entity-folder-glyph" />
                                <strong title={project.name}>{project.name}</strong>
                            </div>
                            <div className="entity-badges-cluster">
                                <Star size={13} className={project.pinned ? "glyph-star-pinned" : "glyph-star-muted"} />
                                <Archive size={13} className="glyph-archive-muted" />
                                <span className={`entity-status-tag ${project.status.toLowerCase()}`}>
                                    {project.status === "Active" ? <Play size={9} fill="currentColor" /> : "○"}
                                    <span>{project.status}</span>
                                </span>
                            </div>
                        </div>
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
                        <div className="entity-stats-row">
                            <span>{project.tasks} {project.tasks === 1 ? "task" : "tasks"}</span>
                            <span>{project.members} {project.members === 1 ? "member" : "members"}</span>
                        </div>
                        <button type="button" className="btn-open-project-pill" onClick={() => onOpenProject && onOpenProject(project)}>
                            Open Project
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Project;
