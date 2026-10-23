import { useState } from "react";
import { FolderPlus, GitBranch, X } from "lucide-react";
import "./HubModals.css";

const NewWorkspaceModal = ({ isOpen, onClose, onCreate }) => {
    const [projectName, setProjectName] = useState("");
    const [projectType, setProjectType] = useState("Local Project");

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!projectName.trim()) return;
        onCreate({ name: projectName, type: projectType });
        setProjectName("");
        onClose();
    };

    return (
        <div className="hub-modal-backdrop" onClick={onClose}>
            <div className="hub-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="hub-modal-header">
                    <div className="modal-title-wrap">
                        <FolderPlus size={18} color="#0284c7" />
                        <strong>Create New Project</strong>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="hub-modal-form">
                    <div className="form-input-field">
                        <label>Project Name</label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g. core-auth-service"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                        />
                    </div>

                    <div className="form-input-field">
                        <label>Workspace Type</label>
                        <select
                            value={projectType}
                            onChange={(e) => setProjectType(e.target.value)}
                        >
                            <option value="Local Project">Local Project</option>
                            <option value="Git Repository (HTTPS)">Git Repository (HTTPS)</option>
                            <option value="Sandboxed Container">Sandboxed Container</option>
                        </select>
                    </div>

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
