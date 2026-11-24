import { Plus, Compass, HelpCircle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../../../components/common/breadcrumb/Breadcrumb";
import TriangleField from "../../../../components/common/canvas/TriangleField";
import "./HubNavbar.css";

const HubNavbar = ({
    activeTabName = "Projects",
    activeProject = null,
    onNewProjectClick,
    onHubClick,
}) => {
    const navigate = useNavigate();

    return (
        <header className="vibe-navbar">
            {/* Nền tam giác động giống trang Overview */}
            <TriangleField />
            <div className="navbar-breadcrumb">
                <Breadcrumb
                    onHomeClick={() => navigate("/overview")}
                    items={[
                        ...(onHubClick
                            ? [{ label: "Developer Hub", onClick: onHubClick }]
                            : [{ label: "Developer Hub" }]),
                        ...(activeProject
                            ? [{ label: activeProject.name }, { label: activeTabName }]
                            : [{ label: activeTabName }]),
                    ]}
                />
            </div>

            {/* Cụm điều khiển bên phải */}
            <div className="navbar-controls-cluster">
                {/* Các phím tắt nhanh */}
                <div className="navbar-keybind-pills">
                    <span className="key-shortcut-tag" title="Navigate (Ctrl+G)">
                        <Compass size={13} />
                        <span>Ctrl G</span>
                    </span>
                    <span className="key-shortcut-tag mini-kbd" title="Help (?)">
                        <HelpCircle size={13} />
                    </span>
                    <span className="key-shortcut-tag" title="History (Ctrl+H)">
                        <BookOpen size={13} />
                        <span>Ctrl H</span>
                    </span>
                </div>

                {/* Nút + New Project chính trên Navbar */}
                <button
                    type="button"
                    className="btn-new-project-primary"
                    onClick={onNewProjectClick}
                >
                    <Plus size={15} />
                    <span>New Project</span>
                </button>
            </div>
        </header>
    );
};

export default HubNavbar;
