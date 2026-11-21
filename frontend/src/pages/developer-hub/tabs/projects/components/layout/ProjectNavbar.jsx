import { Compass, HelpCircle, BookOpen, ChevronsUpDown } from "lucide-react";
import "./ProjectNavbar.css";

const ProjectNavbar = ({
    projectName = "DMS AI Hub",
    activeTabName = "Dashboard",
    onSwitchProject,
    onOpenWorkbench,
    onCreateTask,
    onBackToProjects,
}) => {
    return (
        <header className="vibe-project-navbar">
            {/* Breadcrumb bên trái có dropdown project */}
            <div className="navbar-breadcrumb-cluster">
                <span className="crumb-brand" onClick={onBackToProjects}>
                    VibeFlow
                </span>
                <span className="crumb-slash">/</span>

                <button type="button" className="crumb-project-dropdown" onClick={onSwitchProject}>
                    <strong>{projectName}</strong>
                    <ChevronsUpDown size={13} className="dropdown-caret" />
                </button>

                <span className="crumb-slash">/</span>
                <span className="crumb-page-active">{activeTabName}</span>
            </div>

            {/* Cụm điều khiển bên phải */}
            <div className="navbar-actions-cluster">
                {/* Phím tắt */}
                <div className="navbar-shortcuts-pills">
                    <span className="shortcut-tag">
                        <Compass size={13} /> Ctrl G
                    </span>
                    <span className="shortcut-tag mini-kbd">
                        <HelpCircle size={13} />
                    </span>
                    <span className="shortcut-tag">
                        <BookOpen size={13} /> Ctrl H
                    </span>
                </div>
            </div>
        </header>
    );
};

export default ProjectNavbar;
