import { useState, useEffect } from "react";
import { X, Sparkles, Calendar, Archive } from "lucide-react";
import CustomSelector from "../../../../../../../components/common/selector/CustomSelector";
import "./DetailTaskModal.css";

const STATUS_OPTIONS = [
    { id: "BACKLOG", label: "Backlog", dotClass: "dot-backlog" },
    { id: "IN_PROGRESS", label: "In Progress", dotClass: "dot-in-progress" },
    { id: "REVIEW", label: "Review", dotClass: "dot-review" },
    { id: "COMPLETED", label: "Completed", dotClass: "dot-completed" },
];

const PRIORITY_OPTIONS = [
    { id: "LOW", label: "Low" },
    { id: "MEDIUM", label: "Medium" },
    { id: "HIGH", label: "High" },
    { id: "URGENT", label: "Urgent" },
];

const formatDate = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const DetailTaskModal = ({ isOpen, task, members = [], onClose, onSave, onArchive }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [labels, setLabels] = useState("");
    const [storyPoints, setStoryPoints] = useState("");
    const [originalEstimate, setOriginalEstimate] = useState("");
    const [remainingEstimate, setRemainingEstimate] = useState("");
    const [status, setStatus] = useState("BACKLOG");
    const [priority, setPriority] = useState("MEDIUM");
    const [assigneeEmail, setAssigneeEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title || "");
            setDescription(task.description || "");
            setLabels(task.labels ? task.labels.join(", ") : "");
            setStoryPoints(task.storyPoints || "");
            setOriginalEstimate(task.originalEstimate || "");
            setRemainingEstimate(task.remainingEstimate || "");
            setStatus(task.status || "BACKLOG");
            setPriority(task.priority || "MEDIUM");
            setAssigneeEmail(task.assigneeEmail || "");
            setIsSaving(false);
        }
    }, [task]);

    if (!isOpen || !task) return null;

    // Member của project lấy từ BE
    const assigneeOptions = [
        { value: "", label: "Unassigned" },
        ...members
            .filter((member) => member.email)
            .map((member) => ({ value: member.email, label: member.name || member.email })),
    ];

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        await onSave({
            id: task.id,
            title,
            description,
            labels: labels
                ? labels
                      .split(",")
                      .map((l) => l.trim())
                      .filter(Boolean)
                : [],
            storyPoints,
            originalEstimate,
            remainingEstimate,
            status,
            priority,
            assigneeEmail: assigneeEmail || null,
        });
        setIsSaving(false);
    };

    return (
        <div className="task-modal-fixed-overlay" onClick={onClose}>
            <div className="task-modal-container-card" onClick={(e) => e.stopPropagation()}>
                {/* 1. HEADER CỐ ĐỊNH (Không bị cuộn) */}
                <div className="task-modal-header-fixed">
                    <div className="modal-title-with-tag">
                        <h3>Task Details</h3>
                        <span className="task-id-badge">#{String(task.id).slice(-8)}</span>
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

                        {/* Labels */}
                        <div className="form-input-block">
                            <label className="field-title-label">Labels</label>
                            <input
                                type="text"
                                className="pill-text-input"
                                value={labels}
                                onChange={(e) => setLabels(e.target.value)}
                                placeholder="Comma separated, e.g. backend, bug"
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
                                            key={p.id}
                                            type="button"
                                            className={`btn-priority-toggle ${
                                                priority === p.id ? "selected" : ""
                                            }`}
                                            onClick={() => setPriority(p.id)}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Assignee */}
                        <div className="form-input-block">
                            <label className="field-title-label">Assignee</label>
                            <CustomSelector
                                className="kanban-modal-selector"
                                options={assigneeOptions}
                                value={assigneeEmail}
                                onChange={(value) => setAssigneeEmail(value)}
                                placeholder="Unassigned"
                            />
                        </div>

                        {/* Ngày tạo Created */}
                        <div className="task-created-date-row">
                            <Calendar size={14} />
                            <span>Created: {formatDate(task.createdAt)}</span>
                        </div>
                    </form>
                </div>

                {/* 3. FOOTER CỐ ĐỊNH (Không bị cuộn) */}
                <div className="task-modal-footer-fixed">
                    <button
                        type="button"
                        className="btn-action-archive-left"
                        onClick={() => onArchive(task.id)}
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
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailTaskModal;