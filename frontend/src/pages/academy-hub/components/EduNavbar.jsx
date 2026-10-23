import { BookOpen, Flame, GraduationCap, Plus, UploadCloud } from "lucide-react";
import "./EduNavbar.css";

const EduNavbar = ({ activeTabName, onUploadClick }) => {
    return (
        <header className="edu-navbar">
            <div className="navbar-breadcrumb">
                <span className="crumb-root">Prism Studio</span>
                <span className="crumb-separator">/</span>
                <span className="crumb-hub">Academy Hub</span>
                <span className="crumb-separator">/</span>
                <span className="crumb-current">{activeTabName}</span>
            </div>

            <div className="navbar-controls-cluster">
                {/* Streak Counter */}
                <div className="navbar-metric-chip streak-chip">
                    <Flame size={14} color="#f59e0b" />
                    <span>7 Days Streak</span>
                </div>

                <div className="navbar-metric-chip">
                    <BookOpen size={13} color="#059669" />
                    <span>42 Syllabus Vectorized</span>
                </div>

                <button type="button" className="btn-primary-edu" onClick={onUploadClick}>
                    <UploadCloud size={14} />
                    <span>Upload Courseware</span>
                </button>
            </div>
        </header>
    );
};

export default EduNavbar;
