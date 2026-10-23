import { useState } from "react";
import {
    AlertTriangle,
    Folder,
    FolderOpen,
    FolderPlus,
    GitBranch,
    Info,
    X,
} from "lucide-react";
import "./HubModals.css";

const SOURCE_TYPES = {
    LOCAL_FOLDER: "LOCAL_FOLDER",
    GIT: "GIT",
    EMPTY: "EMPTY",
};

const NewWorkspaceModal = ({ isOpen, onClose, onCreate }) => {
    const [projectName, setProjectName] = useState("");
    const [projectType, setProjectType] = useState(SOURCE_TYPES.LOCAL_FOLDER);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [repoUrl, setRepoUrl] = useState("");
    const [repoBranch, setRepoBranch] = useState("");
    const [formError, setFormError] = useState("");

    if (!isOpen) return null;

    const resetForm = () => {
        setProjectName("");
        setProjectType(SOURCE_TYPES.LOCAL_FOLDER);
        setSelectedFolder("");
        setRepoUrl("");
        setRepoBranch("");
        setFormError("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const normalizedName = projectName.trim();
        if (!normalizedName) return;

        if (projectType === SOURCE_TYPES.GIT && !repoUrl.trim()) {
            setFormError("Please enter a repository URL for Git source.");
            return;
        }

        onCreate({
            name: normalizedName,
            workspaceType: projectType,
            selectedFolder,
            repoUrl: repoUrl.trim(),
            repoBranch: repoBranch.trim(),
        });
        resetForm();
        onClose();
    };

    const handleFolderChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFolder(file.webkitRelativePath?.split("/")[0] || file.name);
        }
    };

    return (
        <div className="hub-modal-backdrop" onClick={onClose}>
            <div
                className="hub-modal-card new-project-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="hub-modal-header">
                    <div className="modal-title-wrap">
                        <FolderPlus size={20} />
                        <div>
                            <strong>New Project</strong>
                            <p>Start from a folder, a repo, or an empty workspace.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="hub-modal-form">
                    <div className="form-input-field">
                        <label>Project Name</label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="My Awesome Project"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                        />
                    </div>

                    <div className="form-input-field project-source-field">
                        <label>Start from...</label>
                        <div className="project-source-grid">
                            <button
                                type="button"
                                className={`project-source-card ${
                                    projectType === SOURCE_TYPES.LOCAL_FOLDER ? "is-selected" : ""
                                }`}
                                onClick={() => {
                                    setProjectType(SOURCE_TYPES.LOCAL_FOLDER);
                                    setFormError("");
                                }}
                            >
                                <FolderOpen size={20} />
                                <span>
                                    <strong>Open a local folder</strong>
                                    <small>A folder on your computer</small>
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`project-source-card ${
                                    projectType === SOURCE_TYPES.GIT ? "is-selected" : ""
                                }`}
                                onClick={() => {
                                    setProjectType(SOURCE_TYPES.GIT);
                                    setFormError("");
                                }}
                            >
                                <GitBranch size={20} />
                                <span>
                                    <strong>Clone a Git repo</strong>
                                    <small>GitHub, GitLab, Azure DevOps</small>
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`project-source-card ${
                                    projectType === SOURCE_TYPES.EMPTY ? "is-selected" : ""
                                }`}
                                onClick={() => {
                                    setProjectType(SOURCE_TYPES.EMPTY);
                                    setFormError("");
                                }}
                            >
                                <Folder size={20} />
                                <span>
                                    <strong>Start empty</strong>
                                    <small>An empty workspace</small>
                                </span>
                            </button>
                        </div>
                    </div>

                    {projectType === SOURCE_TYPES.LOCAL_FOLDER && (
                        <div className="local-copy-panel">
                            <div className="local-copy-content">
                                <strong>Open a local folder</strong>
                                <label className="folder-picker">
                                    <FolderOpen size={16} />
                                    <span>{selectedFolder || "Choose folder"}</span>
                                    <input
                                        type="file"
                                        webkitdirectory=""
                                        directory=""
                                        onChange={handleFolderChange}
                                        aria-label="Choose local folder"
                                    />
                                </label>
                                <p>Open and edit this folder right away — no sandbox needed.</p>
                                <small className="folder-picker-note">
                                    <Info size={14} />
                                    This folder link is saved in this browser. Clearing site data
                                    unlinks it, but your files stay safe on disk.
                                </small>
                            </div>
                        </div>
                    )}

                    {projectType === SOURCE_TYPES.GIT && (
                        <div className="git-repo-panel">
                            <div className="hub-modal-notice git-notice">
                                <GitBranch size={15} />
                                <span>
                                    Teammates share this code through the Git remote — everyone works
                                    in their own sandbox, then commit & push/pull.
                                </span>
                            </div>
                            <div className="form-input-field compact-field">
                                <input
                                    type="text"
                                    placeholder="https://github.com/user/repo.git"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                />
                                <small className="warning-text">
                                    <AlertTriangle size={13} />
                                    No token for this git server — public repos clone fine; private
                                    repos need a token, or start empty instead.
                                </small>
                                <small className="folder-picker-note">
                                    <Info size={14} />
                                    Copy this URL from the repository's Clone button.
                                </small>
                            </div>
                            <div className="form-input-field compact-field">
                                <input
                                    type="text"
                                    placeholder="Default branch (blank = auto-detect)"
                                    value={repoBranch}
                                    onChange={(e) => setRepoBranch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {projectType === SOURCE_TYPES.EMPTY && (
                        <div className="hub-modal-notice">
                            <Info size={15} />
                            <span>
                                Start with an empty workspace and add files later from your machine
                                or by cloning a Git repository.
                            </span>
                        </div>
                    )}

                    {formError && (
                        <div className="form-error-inline" role="alert">
                            {formError}
                        </div>
                    )}

                    <div className="hub-modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!projectName.trim()}
                            className="btn-submit-create"
                        >
                            Create Project
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewWorkspaceModal;
