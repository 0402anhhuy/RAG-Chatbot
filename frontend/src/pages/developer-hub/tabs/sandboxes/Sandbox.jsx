import { useState } from "react";
import { Play, RotateCcw, Search, Terminal } from "lucide-react";
import "./Sandbox.css";

const Sandbox = () => {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="tab-body-container">
            <div className="tab-header-banner">
                <h2>Your sandboxes</h2>
                <span>
                    Sandboxes you own across all projects. Idle sandboxes auto-stop after 1h.
                </span>
            </div>

            <div className="filter-controls-bar">
                <div className="filter-search-box">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search sandboxes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select className="filter-dropdown-select" defaultValue="running">
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                </select>
            </div>

            <div className="sandbox-empty-box">
                <Terminal size={32} />
                <strong>No sandboxes found</strong>
                <p>Start a new runtime environment from any project workspace to run code tests.</p>
                <button type="button" className="btn-start-sandbox">
                    <Play size={13} />
                    <span>Launch New Sandbox</span>
                </button>
            </div>
        </div>
    );
};

export default Sandbox;
