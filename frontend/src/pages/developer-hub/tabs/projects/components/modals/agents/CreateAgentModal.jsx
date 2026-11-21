import { useEffect, useState } from "react";
import {
    X,
    Bot,
    Loader2,
    Server,
    Code2,
    FileText,
    FilePlus,
    Search,
    Scan,
    Database,
    Cloud,
    Shield,
    TestTube,
    Columns3,
    Palette,
    Monitor,
    GitBranch,
    Terminal,
    Globe,
    BookOpen,
    BarChart3,
    Wrench,
    Zap,
    Printer,
    Network,
    Plug,
    Pencil,
    Target,
    Microscope,
    Lightbulb,
    RefreshCw,
} from "lucide-react";
import { agentApi } from "../../../../../../../api";
import CustomSelector from "../../../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../../../context/ToastContext";
import "./CreateAgentModal.css";

const AGENT_ICON_PALETTE = [
    { id: "bot", icon: Bot },
    { id: "server", icon: Server },
    { id: "code", icon: Code2 },
    { id: "file", icon: FileText },
    { id: "file-plus", icon: FilePlus },
    { id: "search", icon: Search },
    { id: "scan", icon: Scan },
    { id: "db", icon: Database },
    { id: "cloud", icon: Cloud },
    { id: "shield", icon: Shield },
    { id: "test-tube", icon: TestTube },
    { id: "columns", icon: Columns3 },
    { id: "palette", icon: Palette },
    { id: "monitor", icon: Monitor },
    { id: "git", icon: GitBranch },
    { id: "terminal", icon: Terminal },
    { id: "globe", icon: Globe },
    { id: "book", icon: BookOpen },
    { id: "chart", icon: BarChart3 },
    { id: "wrench", icon: Wrench },
    { id: "zap", icon: Zap },
    { id: "printer", icon: Printer },
    { id: "network", icon: Network },
    { id: "plug", icon: Plug },
    { id: "pencil", icon: Pencil },
    { id: "target", icon: Target },
    { id: "microscope", icon: Microscope },
    { id: "lightbulb", icon: Lightbulb },
    { id: "refresh", icon: RefreshCw },
];

const AGENT_COLORS = [
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

const PERMISSION_OPTIONS = [
    { value: "Full access", label: "Full access" },
    { value: "Scoped edits", label: "Scoped edits" },
    { value: "Docs writer", label: "Docs writer" },
];

const PERMISSION_HINTS = {
    "Full access": "Edit any file, run commands, fetch the web (implementers).",
    "Scoped edits": "Edit only the files needed for the task, no destructive commands.",
    "Docs writer": "Write and update documentation, no source-code edits.",
};

const CreateAgentModal = ({ isOpen, projectId, onClose, onCreated }) => {
    const { showToast } = useToast();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedIconId, setSelectedIconId] = useState("bot");
    const [selectedColor, setSelectedColor] = useState("#3B82F6");
    const [promptText, setPromptText] = useState("");
    const [permissionPreset, setPermissionPreset] = useState("Full access");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    // Reset form mỗi lần mở modal
    useEffect(() => {
        if (!isOpen) return;
        setName("");
        setDescription("");
        setSelectedIconId("bot");
        setSelectedColor("#3B82F6");
        setPromptText("");
        setPermissionPreset("Full access");
        setIsSubmitting(false);
        setFormError("");
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!name.trim()) {
            setFormError("Name is required.");
            return;
        }
        if (!projectId) {
            setFormError("No project selected.");
            return;
        }

        setIsSubmitting(true);
        setFormError("");
        try {
            const created = await agentApi.create(projectId, {
                name: name.trim(),
                description: description.trim() || null,
                color: selectedColor,
                iconKey: selectedIconId,
                permissions: permissionPreset,
                prompt: promptText.trim() || null,
            });
            onCreated?.(created);
            onClose();
        } catch (err) {
            const message = err.message || "Unable to create the agent.";
            setFormError(message);
            showToast(message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-agent-modal-overlay" onClick={onClose}>
            <div className="create-agent-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* 1. Header Cố Định */}
                <div className="agent-modal-header-fixed">
                    <div className="agent-modal-title-col">
                        <h3>Create Agent</h3>
                        <p>Create a new custom agent</p>
                    </div>
                    <button type="button" className="btn-modal-close" onClick={onClose}>
                        <X size={17} />
                    </button>
                </div>

                {/* 2. Body Cuộn Độc Lập Ở Giữa */}
                <div className="agent-modal-body-scrollable">
                    <form
                        id="create-agent-form"
                        onSubmit={handleSubmit}
                        className="agent-modal-form-fields"
                    >
                        {/* Name * */}
                        <div className="modal-field-group">
                            <label className="field-title-label">Name *</label>
                            <input
                                type="text"
                                className="input-agent-name-pill"
                                placeholder="e.g. data-engineer"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div className="modal-field-group">
                            <label className="field-title-label">Description</label>
                            <input
                                type="text"
                                className="input-agent-default-pill"
                                placeholder="What this agent does"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Icon Lưới */}
                        <div className="modal-field-group">
                            <label className="field-title-label">Icon</label>
                            <div className="agent-icons-grid">
                                {AGENT_ICON_PALETTE.map((item) => {
                                    const IconComp = item.icon;
                                    const isSelected = selectedIconId === item.id;

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`btn-agent-icon-box ${isSelected ? "selected" : ""}`}
                                            onClick={() => setSelectedIconId(item.id)}
                                        >
                                            <IconComp size={15} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color */}
                        <div className="modal-field-group">
                            <label className="field-title-label">Color</label>
                            <div className="agent-colors-row">
                                <div className="color-dots-list">
                                    {AGENT_COLORS.map((colorHex) => (
                                        <button
                                            key={colorHex}
                                            type="button"
                                            className={`btn-agent-color-dot ${selectedColor === colorHex ? "active" : ""}`}
                                            style={{ backgroundColor: colorHex }}
                                            onClick={() => setSelectedColor(colorHex)}
                                        />
                                    ))}
                                </div>
                                <span className="color-code-badge">{selectedColor}</span>
                            </div>
                        </div>

                        {/* Prompt (Dashed Box) */}
                        <div className="modal-field-group">
                            <label className="field-title-label">Prompt</label>
                            <div className="prompt-dashed-box">
                                <textarea
                                    className="prompt-native-textarea"
                                    rows={2}
                                    placeholder="Click to edit prompt, or ask VibeFlow to generate"
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Permissions */}
                        <div className="modal-field-group">
                            <label className="field-title-label">Permissions</label>
                            <span className="field-preset-subtitle">Permission preset</span>
                            <CustomSelector
                                options={PERMISSION_OPTIONS}
                                value={permissionPreset}
                                onChange={(value) => setPermissionPreset(value)}
                                placeholder="Select permissions"
                                className="agent-permission-selector"
                            />
                            <small className="field-subnote-text">
                                {PERMISSION_HINTS[permissionPreset] ||
                                    PERMISSION_HINTS["Full access"]}
                            </small>
                        </div>

                        {formError && (
                            <p className="agent-form-error-text" role="alert">
                                {formError}
                            </p>
                        )}
                    </form>
                </div>

                {/* 3. Footer Cố Định */}
                <div className="agent-modal-footer-fixed">
                    <button type="button" className="btn-agent-cancel-pill" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="create-agent-form"
                        className="btn-agent-submit-pill"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={14} className="agents-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <span>Create</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateAgentModal;
