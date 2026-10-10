import { useState, useEffect } from "react";
import { X, Sparkles, Paperclip, UploadCloud, Calendar, Archive, ChevronDown } from "lucide-react";
import "./DetailTaskModal.css";

const STATUS_OPTIONS = [
    { id: "backlog", label: "Backlog", dotClass: "dot-backlog" },
    { id: "in_progress", label: "In Progress", dotClass: "dot-in-progress" },
    { id: "review", label: "Review", dotClass: "dot-review" },
    { id: "completed", label: "Completed", dotClass: "dot-completed" },
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const DetailTaskModal = ({ isOpen, task, onClose, onSave, onArchive }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [labels, setLabels] = useState("");
    const [storyPoints, setStoryPoints] = useState("");
    const [originalEstimate, setOriginalEstimate] = useState("3w 4d 12h");
    const [remainingEstimate, setRemainingEstimate] = useState("3w 4d 12h");
    const [status, setStatus] = useState("in_progress");
    const [priority, setPriority] = useState("Medium");
    const [assignee, setAssignee] = useState("Huy Tran Anh");

    useEffect(() => {
        if (task) {
            setTitle(task.title || "");
            setDescription(task.description || "");
            setLabels(task.labels ? task.labels.join(", ") : "");
            setStoryPoints(task.storyPoints || "");
            setOriginalEstimate(task.originalEstimate || "3w 4d 12h");
            setRemainingEstimate(task.remainingEstimate || "3w 4d 12h");
            setStatus(task.status || "in_progress");
            setPriority(task.priority || "Medium");
            setAssignee(task.assignee || "Huy Tran Anh");
        }
    }, [task]);

    if (!isOpen || !task) return null;

    const handleSave = (e) => {
        e.preventDefault();
        onSave({
            ...task,
            title,
            description,
            labels: labels ? labels.split(",").map((l) => l.trim()) : [],
            storyPoints,
            originalEstimate,
            remainingEstimate,
            status,
            priority,
            assignee,
        });
        onClose();
    };

    return (
        <div className="task-modal-fixed-overlay" onClick={onClose}>
            <div className="task-modal-container-card" onClick={(e) => e.stopPropagation()}>
                {/* 1. HEADER CỐ ĐỊNH (Không bị cuộn) */}
                <div className="task-modal-header-fixed">
                    <div className="modal-title-with-tag">
                        <h3>Task Details</h3>
                        <span className="task-id-badge">#{task.id?.slice(-8) || "2b6a0684"}</span>
                    </div>
                    <button type="button" className="btn-modal-close-round" onClick={onClose}>
                        <X size={17} />
                    </button>
                </div>

                {/* 2. BODY CUỘN RIÊNG Ở GIỮA */}
                <div className="task-modal-body-scrollable">
                    <form id="edit-task-form" onSubmit={handleSave} className="modal-inner-fields">
                        {/* Title */}
                        <div className="form-input-block">
                            <label className="field-title-label">Title</label>
                            <input
                                type="text"
                                className="pill-text-input active-border"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="form-input-block">
                            <div className="field-action-header-line">
                                <label className="field-title-label">Description</label>
                                <button
                                    type="button"
                                    className="btn-ai-generate-link"
                                    onClick={() =>
                                        setDescription(
                                            `Implemented and reviewed code logic for ${title}.`,
                                        )
                                    }
                                >
                                    <Sparkles size={13} />
                                    <span>Generate</span>
                                </button>
                            </div>
                            <textarea
                                className="textarea-field-box"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="No description. Click Generate to create one."
                            />
                        </div>

                        {/* Attachments */}
                        <div className="form-input-block">
                            <div className="field-icon-label-row">
                                <Paperclip size={14} className="attachment-clip-glyph" />
                                <label className="field-title-label">Attachments</label>
                            </div>
                            <div className="dropzone-dashed-box">
                                <UploadCloud size={15} />
                                <span>Drop files here or click to browse (max 50 MB)</span>
                            </div>
                        </div>

                        {/* Labels */}
                        <div className="form-input-block">
                            <label className="field-title-label">Labels</label>
                            <input
                                type="text"
                                className="pill-text-input"
                                value={labels}
                                onChange={(e) => setLabels(e.target.value)}
                                placeholder="Add label (press Enter to add)"
                            />
                        </div>

                        {/* 3 Cột Estimates */}
                        <div className="estimates-triplet-grid">
                            <div className="form-input-block">
                                <label className="field-title-label">Story Points</label>
                                <input
                                    type="text"
                                    className="pill-text-input"
                                    value={storyPoints}
                                    onChange={(e) => setStoryPoints(e.target.value)}
                                />
                            </div>
                            <div className="form-input-block">
                                <label className="field-title-label">Original Estimate</label>
                                <input
                                    type="text"
                                    className="pill-text-input"
                                    value={originalEstimate}
                                    onChange={(e) => setOriginalEstimate(e.target.value)}
                                />
                            </div>
                            <div className="form-input-block">
                                <label className="field-title-label">Remaining Estimate</label>
                                <input
                                    type="text"
                                    className="pill-text-input"
                                    value={remainingEstimate}
                                    onChange={(e) => setRemainingEstimate(e.target.value)}
                                />
                            </div>
                        </div>
                        <small className="field-jira-help-text">
                            Jira duration, e.g. 3w 4d 12h. A number with no unit is read as minutes.
                        </small>

                        {/* Status & Priority */}
                        <div className="status-priority-dual-row">
                            <div className="dual-column">
                                <label className="field-title-label">Status</label>
                                <div className="status-chips-2col-grid">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            className={`btn-chip-status-selector ${
                                                status === opt.id ? "selected" : ""
                                            }`}
                                            onClick={() => setStatus(opt.id)}
                                        >
                                            <span className={`chip-color-dot ${opt.dotClass}`} />
                                            <span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="dual-column">
                                <label className="field-title-label">Priority</label>
                                <div className="priority-pills-horizontal">
                                    {PRIORITY_OPTIONS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`btn-priority-toggle ${
                                                priority === p ? "selected" : ""
                                            }`}
                                            onClick={() => setPriority(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Assignee */}
                        <div className="form-input-block">
                            <label className="field-title-label">Assignee</label>
                            <div className="assignee-pill-container">
                                <div className="avatar-letter-circle">HT</div>
                                <span className="assignee-display-name">{assignee}</span>
                                <div className="assignee-right-controls">
                                    <X
                                        size={13}
                                        className="clear-assignee-glyph"
                                        onClick={() => setAssignee("")}
                                    />
                                    <ChevronDown size={14} className="dropdown-caret-glyph" />
                                </div>
                            </div>
                        </div>

                        {/* Ngày tạo Created */}
                        <div className="task-created-date-row">
                            <Calendar size={14} />
                            <span>Created: 10/10/2026</span>
                        </div>
                    </form>
                </div>

                {/* 3. FOOTER CỐ ĐỊNH (Không bị cuộn) */}
                <div className="task-modal-footer-fixed">
                    <button
                        type="button"
                        className="btn-action-archive-left"
                        onClick={() => {
                            if (onArchive) onArchive(task.id);
                            onClose();
                        }}
                    >
                        <Archive size={14} />
                        <span>Archive</span>
                    </button>

                    <div className="footer-right-buttons-cluster">
                        <button type="button" className="btn-footer-close-pill" onClick={onClose}>
                            Close
                        </button>
                        <button
                            type="submit"
                            form="edit-task-form"
                            className="btn-footer-save-pill"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailTaskModal;
