import { useState } from "react";
import {
    X,
    Server,
    Columns3,
    Cloud,
    Database,
    Code2,
    SlidersHorizontal,
    Layers,
    Rocket,
    Bug,
    ArrowLeftRight,
    Monitor,
    Sparkles,
    RefreshCw,
} from "lucide-react";
import "./NewWorkflowModal.css";

const ICON_LIST = [
    { id: "server", icon: Server },
    { id: "columns", icon: Columns3 },
    { id: "cloud", icon: Cloud },
    { id: "db", icon: Database },
    { id: "code", icon: Code2 },
    { id: "sliders", icon: SlidersHorizontal },
    { id: "layers", icon: Layers },
    { id: "rocket", icon: Rocket },
    { id: "bug", icon: Bug },
    { id: "swap", icon: ArrowLeftRight },
    { id: "monitor", icon: Monitor },
    { id: "sparkles", icon: Sparkles },
    { id: "refresh", icon: RefreshCw },
];

const COLOR_PALETTE = [
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Amber
    "#10B981", // Green
    "#06B6D4", // Teal
    "#3B82F6", // Blue (Default)
    "#6366F1", // Indigo
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#64748B", // Slate
];

const NewWorkflowModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedIconId, setSelectedIconId] = useState("layers");
    const [selectedColor, setSelectedColor] = useState("#3B82F6");

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        onCreate({
            title: name.trim(),
            description: description.trim(),
            color: selectedColor,
            iconId: selectedIconId,
        });

        setName("");
        setDescription("");
        onClose();
    };

    return (
        <div className="new-wf-modal-overlay" onClick={onClose}>
            <div className="new-wf-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="new-wf-modal-header">
                    <div className="new-wf-title-col">
                        <h3>New Workflow</h3>
                        <p>Create a new workflow template from scratch.</p>
                    </div>
                    <button type="button" className="btn-wf-modal-close" onClick={onClose}>
                        <X size={17} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="new-wf-form-body">
                    {/* Name */}
                    <div className="wf-form-group">
                        <label className="wf-field-label">Name</label>
                        <input
                            type="text"
                            className="input-wf-name-pill"
                            placeholder="e.g. Full-stack Review"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Description (optional) */}
                    <div className="wf-form-group">
                        <label className="wf-field-label">Description (optional)</label>
                        <textarea
                            className="textarea-wf-desc"
                            rows={3}
                            placeholder="Describe what this template does..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Icon Selection */}
                    <div className="wf-form-group">
                        <label className="wf-field-label">Icon</label>
                        <div className="wf-icons-grid">
                            {ICON_LIST.map((item) => {
                                const IconComp = item.icon;
                                const isSelected = selectedIconId === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`btn-wf-icon-box ${isSelected ? "selected" : ""}`}
                                        onClick={() => setSelectedIconId(item.id)}
                                    >
                                        <IconComp size={16} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color Palette Selection */}
                    <div className="wf-form-group">
                        <label className="wf-field-label">Color</label>
                        <div className="wf-color-palette-row">
                            <div className="color-swatches-list">
                                {COLOR_PALETTE.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`btn-color-dot ${selectedColor === c ? "active" : ""}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setSelectedColor(c)}
                                    />
                                ))}
                            </div>

                            {/* Mã màu Hex preview */}
                            <span className="color-hex-tag-pill">{selectedColor}</span>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="new-wf-footer-actions">
                        <button type="button" className="btn-wf-cancel-pill" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-wf-submit-pill">
                            Create & Edit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewWorkflowModal;
