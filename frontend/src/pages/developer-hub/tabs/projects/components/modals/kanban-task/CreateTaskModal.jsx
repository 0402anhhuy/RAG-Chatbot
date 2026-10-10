import { useState, useEffect } from "react";
import { X, Sparkles, User, ChevronDown } from "lucide-react";
import "./CreateTaskModal.css";

const STATUS_OPTIONS = [
    { id: "backlog", label: "Backlog", dotClass: "dot-backlog" },
    { id: "in_progress", label: "In Progress", dotClass: "dot-in-progress" },
    { id: "review", label: "Review", dotClass: "dot-review" },
    { id: "completed", label: "Completed", dotClass: "dot-completed" },
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const CreateTaskModal = ({
    isOpen,
    onClose,
    onCreate,
    initialStatus = "in_progress",
}) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [labels, setLabels] = useState("");
    const [storyPoints, setStoryPoints] = useState("");
    const [originalEstimate, setOriginalEstimate] = useState("3w 4d 12h");
    const [remainingEstimate, setRemainingEstimate] = useState("3w 4d 12h");
    const [status, setStatus] = useState(initialStatus);
    const [priority, setPriority] = useState("Medium");
    const [assignee, setAssignee] = useState("");

    // Đồng bộ lại status khi modal được mở từ một cột cụ thể
    useEffect(() => {
        if (isOpen) {
            setStatus(initialStatus);
            setTitle("");
            setDescription("");
            setLabels("");
            setStoryPoints("");
            setOriginalEstimate("3w 4d 12h");
            setRemainingEstimate("3w 4d 12h");
            setPriority("Medium");
            setAssignee("");
        }
    }, [isOpen, initialStatus]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const newTask = {
            id: `task-${Date.now()}`,
            title: title.trim(),
            description,
            labels: labels ? labels.split(",").map((l) => l.trim()).filter(Boolean) : [],
            storyPoints,
            originalEstimate,
            remainingEstimate,
            status,
            priority,
            assignee: assignee || "Huy Tran Anh",
        };

        if (onCreate) onCreate(newTask);
        onClose();
    };

    return (
        <div className="new-task-modal-overlay" onClick={onClose}>
            <div
                className="new-task-modal-card"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. HEADER CỐ ĐỊNH (Không bị cuộn) */}
                <div className="modal-header-fixed">
                    <h3>Create New Task</h3>
                    <button
                        type="button"
                        className="btn-modal-close"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 2. BODY CUỘN RIÊNG Ở GIỮA */}
                <div className="modal-body-scrollable">
                    <form id="create-new-task-form" onSubmit={handleSubmit} className="modal-form-fields">
                        {/* Title */}
                        <div className="form-field-group">
                            <label className="field-label">Title</label>
                            <input
                                type="text"
                                className="input-title-pill"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div className="form-field-group">
                            <div className="label-with-action-row">
                                <label className="field-label">Description</label>
                                <button
                                    type="button"
                                    className="btn-ai-generate"
                                    onClick={() =>
                                        setDescription(
                                            title
                                                ? `Implement and verify: ${title}`
                                                : "Generated task requirements and scope."
                                        )
                                    }
                                >
                                    <Sparkles size={14} />
                                    <span>Generate</span>
                                </button>
                            </div>
                            <textarea
                                className="textarea-description"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="No description. Click Generate to create one."
                            />
                        </div>

                        {/* Labels */}
                        <div className="form-field-group">
                            <label className="field-label">Labels</label>
                            <input
                                type="text"
                                className="input-default-pill"
                                value={labels}
                                onChange={(e) => setLabels(e.target.value)}
                                placeholder="Add label (press Enter to add)"
                            />
                        </div>

                        {/* Estimates 3 columns */}
                        <div className="estimates-three-grid">
                            <div className="form-field-group">
                                <label className="field-label">Story Points</label>
                                <input
                                    type="text"
                                    className="input-default-pill"
                                    value={storyPoints}
                                    onChange={(e) => setStoryPoints(e.target.value)}
                                />
                            </div>

                            <div className="form-field-group">
                                <label className="field-label">Original Estimate</label>
                                <input
                                    type="text"
                                    className="input-default-pill"
                                    value={originalEstimate}
                                    onChange={(e) => setOriginalEstimate(e.target.value)}
                                    placeholder="3w 4d 12h"
                                />
                            </div>

                            <div className="form-field-group">
                                <label className="field-label">Remaining Estimate</label>
                                <input
                                    type="text"
                                    className="input-default-pill"
                                    value={remainingEstimate}
                                    onChange={(e) => setRemainingEstimate(e.target.value)}
                                    placeholder="3w 4d 12h"
                                />
                            </div>
                        </div>
                        <small className="field-caption-note">
                            Jira duration, e.g. 3w 4d 12h. A number with no unit is read as minutes.
                        </small>

                        {/* Status & Priority Row */}
                        <div className="status-priority-row">
                            {/* Status (4 Pills) */}
                            <div className="status-field-col">
                                <label className="field-label">Status</label>
                                <div className="status-chips-grid">
                                    {STATUS_OPTIONS.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`btn-status-chip ${
                                                status === item.id ? "selected" : ""
                                            }`}
                                            onClick={() => setStatus(item.id)}
                                        >
                                            <span className={`chip-dot ${item.dotClass}`} />
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="priority-field-col">
                                <label className="field-label">Priority</label>
                                <div className="priority-options-row">
                                    {PRIORITY_OPTIONS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`btn-priority-item ${
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
                        <div className="form-field-group">
                            <label className="field-label">Assignee</label>
                            <div className="assignee-select-pill-wrap">
                                <User size={15} className="assignee-glyph-muted" />
                                <select
                                    className="assignee-native-select"
                                    value={assignee}
                                    onChange={(e) => setAssignee(e.target.value)}
                                >
                                    <option value="">Assign to...</option>
                                    <option value="Huy Tran Anh">Huy Tran Anh</option>
                                </select>
                                <ChevronDown size={14} className="assignee-caret-glyph" />
                            </div>
                        </div>
                    </form>
                </div>

                {/* 3. FOOTER CỐ ĐỊNH (Không bị cuộn) */}
                <div className="modal-footer-fixed">
                    <button
                        type="button"
                        className="btn-cancel-pill"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="create-new-task-form"
                        className="btn-submit-task-pill"
                    >
                        Create Task
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTaskModal;