import { Plus, Compass, HelpCircle, BookOpen } from "lucide-react";
import BrandLogo from "../../../../components/common/logo/BrandLogo";
import "./HubNavbar.css";

const HubNavbar = ({
    activeTabName = "Projects",
    activeProject = null,
    onNewProjectClick,
    sandboxStatus = null,
    onStopSandbox,
}) => {
    return (
        <header className="vibe-navbar">
            <div className="navbar-breadcrumb">
                <BrandLogo size="md" showText title="Prism Studio" />
                <span className="crumb-separator">/</span>
                <span className="crumb-root">Developer Hub</span>
                <span className="crumb-separator">/</span>
                {activeProject ? (
                    <>
                        <span className="crumb-project">{activeProject.name}</span>
                        <span className="crumb-separator">/</span>
                        <span className="crumb-current">{activeTabName}</span>
                    </>
                ) : (
                    <span className="crumb-current">{activeTabName}</span>
                )}
            </div>

            {/* Cụm điều khiển bên phải */}
            <div className="navbar-controls-cluster">
                {/* Trạng thái Sandbox nếu đang trong Project */}
                {sandboxStatus && (
                    <div className="navbar-sandbox-indicator">
                        <span className="sandbox-running-badge">Running</span>
                        <div className="sandbox-progress-track">
                            <div className="sandbox-progress-bar" style={{ width: "12%" }} />
                        </div>
                        <span className="sandbox-memory-text">
                            {sandboxStatus.memory || "0.3/8.6"}
                        </span>
                        {onStopSandbox && (
                            <button
                                type="button"
                                className="btn-stop-sandbox-outline"
                                onClick={onStopSandbox}
                            >
                                Stop Sandbox
                            </button>
                        )}
                    </div>
                )}

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
