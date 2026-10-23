import { useState } from "react";
import {
    Folder,
    Star,
    Play,
    Plus,
    MessageSquare,
    Terminal,
    CheckSquare,
    ChevronRight,
    Heart,
    Crown,
    Archive,
} from "lucide-react";
import "./Home.css";

const PINNED_PROJECTS = [
    {
        id: "dms-ai-hub",
        name: "DMS AI Hub",
        type: "Local Project",
        status: "Active",
        tasks: 0,
        members: 1,
    },
    {
        id: "aivibecode",
        name: "aivibecode",
        type: "Local Project",
        status: "Idle",
        tasks: 0,
        members: 1,
    },
    {
        id: "about-vibeflow",
        name: "About Vibeflow",
        type: "Local Project",
        status: "Idle",
        tasks: 0,
        members: 1,
    },
    {
        id: "jira-skill",
        name: "jira-skill",
        type: "Local Project",
        status: "Idle",
        tasks: 0,
        members: 1,
    },
];

const ALL_PROJECTS = [
    {
        id: "webapp",
        name: "WebApp",
        type: "Local Project",
        status: "Idle",
        tasks: 1,
        members: 1,
    },
    {
        id: "shoestore",
        name: "ShoeStore",
        type: "Local Project",
        status: "Idle",
        tasks: 2,
        members: 5,
    },
];

const Home = ({ onNavigateTab, onOpenProject, onNewProjectClick }) => {
    return (
        <div className="vibeflow-home-viewport">
            {/* 1. Hero Banner: VibeFlow loves */}
            <div className="home-loves-hero-banner">
                <div className="loves-hero-title-group">
                    <span className="loves-wave-glyph">〜</span>
                    <h1>VibeFlow loves</h1>
                </div>
                <div className="loves-badge-pill">
                    <Crown size={16} className="crown-glyph" />
                    <span className="badge-wave">~</span>
                    <Heart size={16} className="heart-glyph" />
                </div>
            </div>

            {/* 2. Dải khung Skeleton phụ bên dưới Banner */}
            <div className="home-hero-sub-slot" />

            {/* 3. Khối 6 ô Skeleton tóm lược */}
            <div className="home-summary-slots-grid">
                {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="summary-slot-card" />
                ))}
            </div>

            {/* 4. Hàng 3 Widget: Conversations, Sandboxes, Tasks */}
            <div className="home-widgets-tri-grid">
                {/* Conversations Widget */}
                <div className="home-activity-widget-box">
                    <div className="widget-box-header">
                        <div className="widget-header-left">
                            <MessageSquare size={15} />
                            <strong>Conversations</strong>
                        </div>
                        <button
                            type="button"
                            className="btn-view-all-text"
                            onClick={() => onNavigateTab && onNavigateTab("conversations")}
                        >
                            View all →
                        </button>
                    </div>
                    <div className="widget-bar-slot" />
                    <div className="widget-bar-slot" />
                </div>

                {/* Sandboxes Widget */}
                <div className="home-activity-widget-box">
                    <div className="widget-box-header">
                        <div className="widget-header-left">
                            <Terminal size={15} />
                            <strong>Sandboxes</strong>
                        </div>
                        <button
                            type="button"
                            className="btn-view-all-text"
                            onClick={() => onNavigateTab && onNavigateTab("sandboxes")}
                        >
                            View all →
                        </button>
                    </div>
                    <div className="widget-bar-slot" />
                    <div className="widget-bar-slot" />
                </div>

                {/* Tasks Widget */}
                <div className="home-activity-widget-box">
                    <div className="widget-box-header">
                        <div className="widget-header-left">
                            <CheckSquare size={15} />
                            <strong>Tasks</strong>
                        </div>
                        <button
                            type="button"
                            className="btn-view-all-text"
                            onClick={() => onNavigateTab && onNavigateTab("tasks")}
                        >
                            View all →
                        </button>
                    </div>
                    <div className="widget-bar-slot" />
                    <div className="widget-bar-slot" />
                </div>
            </div>

            {/* 5. Nhóm Pinned Projects */}
            <div className="home-section-projects-block">
                <div className="projects-group-header-row">
                    <div className="group-header-title">
                        <Star size={14} className="star-gold-glyph" />
                        <span>Pinned</span>
                    </div>
                    <button
                        type="button"
                        className="btn-view-all-text"
                        onClick={() => onNavigateTab && onNavigateTab("projects")}
                    >
                        View all 11 <ChevronRight size={13} />
                    </button>
                </div>

                <div className="projects-cards-three-col">
                    {PINNED_PROJECTS.map((project) => (
                        <div key={project.id} className="project-card-surface">
                            <div className="project-card-top-bar">
                                <div className="project-identity-wrap">
                                    <Folder size={17} className="project-folder-icon" />
                                    <strong>{project.name}</strong>
                                </div>
                                <div className="project-top-indicators">
                                    <Star size={13} className="star-gold-glyph" />
                                    <Archive size={13} className="archive-icon-glyph" />
                                    <span
                                        className={`status-tag-chip ${project.status.toLowerCase()}`}
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

                            <span className="project-location-type">{project.type}</span>

                            <div className="project-stats-subline">
                                <span>{project.tasks} tasks</span>
                                <span>{project.members} member</span>
                            </div>

                            <button
                                type="button"
                                className="btn-open-project-action"
                                onClick={() => onOpenProject && onOpenProject(project)}
                            >
                                Open Project
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 6. Nhóm All Projects */}
            <div className="home-section-projects-block bottom-spacing">
                <div className="projects-group-header-row">
                    <div className="group-header-title">
                        <span>All Projects</span>
                    </div>
                </div>

                <div className="projects-cards-three-col">
                    {ALL_PROJECTS.map((project) => (
                        <div key={project.id} className="project-card-surface">
                            <div className="project-card-top-bar">
                                <div className="project-identity-wrap">
                                    <Folder size={17} className="project-folder-icon" />
                                    <strong>{project.name}</strong>
                                </div>
                                <div className="project-top-indicators">
                                    <Star size={13} className="star-muted-glyph" />
                                    <Archive size={13} className="archive-icon-glyph" />
                                    <span className="status-tag-chip idle">
                                        ○ <span>{project.status}</span>
                                    </span>
                                </div>
                            </div>

                            <span className="project-location-type">{project.type}</span>

                            <div className="project-stats-subline">
                                <span>{project.tasks} task</span>
                                <span>{project.members} members</span>
                            </div>

                            <button
                                type="button"
                                className="btn-open-project-action"
                                onClick={() => onOpenProject && onOpenProject(project)}
                            >
                                Open Project
                            </button>
                        </div>
                    ))}

                    {/* Thẻ tạo nhanh dự án */}
                    <div
                        className="project-card-surface card-new-project-dashed"
                        onClick={onNewProjectClick}
                    >
                        <Plus size={20} />
                        <span>New Project</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
