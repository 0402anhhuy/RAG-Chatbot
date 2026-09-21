import { Command, HelpCircle, Plus, Terminal } from "lucide-react";
import "./HubNavbar.css";

const HubNavbar = ({ activeTabName, onNewProjectClick }) => {
    return (
        <header className="vibe-navbar">
            <div className="navbar-breadcrumb">
                <span className="crumb-root">Prism Studio</span>
                <span className="crumb-separator">/</span>
                <span className="crumb-hub">Developer Hub</span>
                <span className="crumb-separator">/</span>
                <span className="crumb-current">{activeTabName}</span>
            </div>

            <div className="navbar-controls-cluster">
                <div className="navbar-metric-chip">
                    <Terminal size={13} color="#0284c7" />
                    <span>4 / 5 Sandboxes</span>
                </div>

                <div className="navbar-keybind-pills">
                    <span className="key-shortcut-tag">
                        <Command size={11} /> Ctrl G
                    </span>
                    <span className="key-shortcut-tag">
                        <HelpCircle size={11} /> Ctrl H
                    </span>
                </div>

                <button type="button" className="btn-primary-action" onClick={onNewProjectClick}>
                    <Plus size={14} />
                    <span>New Project</span>
                </button>
            </div>
        </header>
    );
};

export default HubNavbar;
