import { Compass, HelpCircle, BookOpen, ChevronsUpDown, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../../../../../components/common/breadcrumb/Breadcrumb";
import TriangleField from "../../../../../../components/common/canvas/TriangleField";
import "./ProjectNavbar.css";

const ProjectNavbar = ({
    projectName = "DMS AI Hub",
    activeTabName = "Dashboard",
    onSwitchProject,
    onOpenWorkbench,
    onCreateTask,
    onBackToProjects,
}) => {
    const navigate = useNavigate();

    return (
        <header className="vibe-project-navbar">
            {/* Nền tam giác động nhẹ, giống navbar của Hub */}
            <TriangleField />

            {/* Breadcrumb bên trái có dropdown project */}
            <div className="navbar-breadcrumb-cluster">
                <Breadcrumb
                    onHomeClick={() => navigate("/overview")}
                    items={[
                        ...(onBackToProjects
                            ? [{ label: "Projects", onClick: onBackToProjects }]
                            : []),
                        {
                            label: (
                                <>
                                    <strong>{projectName}</strong>
                                    <ChevronsUpDown size={13} className="dropdown-caret" />
                                </>
                            ),
                            onClick: onSwitchProject,
                        },
                        { label: activeTabName },
                    ]}
                />
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

                <button
                    type="button"
                    className="btn-open-workbench-nav"
                    onClick={onOpenWorkbench}
                >
                    <Terminal size={14} />
                    <span>Open Workbench</span>
                </button>
            </div>
        </header>
    );
};

export default ProjectNavbar;
