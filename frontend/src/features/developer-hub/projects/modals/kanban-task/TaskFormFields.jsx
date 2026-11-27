import { useRef, useState } from "react";
import { PenLine, X } from "lucide-react";
import AssigneePicker from "@/features/developer-hub/projects/modals/kanban-task/AssigneePicker.jsx";
import DescriptionModal from "@/features/developer-hub/projects/modals/kanban-task/DescriptionModal.jsx";

/**
 * Bộ field dùng CHUNG cho chế độ tạo và chế độ xem/sửa task.
 * Chỉ phần UI: dữ liệu, validation và API vẫn do modal cha quyết định.
 *
 * @param {"create"|"edit"} mode
 */

export const STATUS_OPTIONS = [
    { id: "BACKLOG", label: "Backlog", dotClass: "dot-backlog" },
    { id: "IN_PROGRESS", label: "In Progress", dotClass: "dot-in-progress" },
    { id: "REVIEW", label: "Review", dotClass: "dot-review" },
    { id: "COMPLETED", label: "Completed", dotClass: "dot-completed" },
];

export const PRIORITY_OPTIONS = [
    { id: "LOW", label: "Low" },
    { id: "MEDIUM", label: "Medium" },
    { id: "HIGH", label: "High" },
    { id: "URGENT", label: "Urgent" },
];

const DESCRIPTION_CLAMP_LINES = 4;

const TaskFormFields = ({
    mode = "create",
    idPrefix = "ctm",
    values,
    setValues,
    titleRef,
    labelInputRef,
    assigneeRef,
    descriptionTriggerRef,
    showTitleError = false,
    onTitleChange,
    generateDescription,
    contextProjectId = null,
    hasContext = false,
}) => {
    const [labelDraft, setLabelDraft] = useState("");
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
    const descPanelRef = useRef(null);

    const patch = (key, value) =>
        setValues((prev) => ({ ...prev, [key]: value }));

    // ---- Labels: Enter để thêm chip; bỏ rỗng và trùng ----
    const commitLabel = () => {
        const next = labelDraft.trim().replace(/,$/, "").trim();
        if (!next) return;
        setValues((prev) =>
            prev.labels.includes(next)
                ? prev
                : { ...prev, labels: [...prev.labels, next] },
        );
        setLabelDraft("");
    };

    const removeLabel = (label) =>
        setValues((prev) => ({
            ...prev,
            labels: prev.labels.filter((item) => item !== label),
        }));

    const handleLabelKeyDown = (event) => {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commitLabel();
            return;
        }
        if (event.key === "Backspace" && !labelDraft && values.labels.length) {
            removeLabel(values.labels[values.labels.length - 1]);
        }
    };

    // ---- Description: ô xem trước, không gõ trực tiếp ----
    // Click chuột hoặc Enter/Space khi đang focus mới mở; Tab đi qua thì không.
    const openDescription = () => setIsDescriptionOpen(true);

    const closeDescription = () => {
        // Đóng thì trả focus về ô Description, không tự mở lại (vì chỉ mở khi click/Enter)
        setIsDescriptionOpen(false);
        window.requestAnimationFrame(() =>
            descriptionTriggerRef?.current?.focus({ preventScroll: true }),
        );
    };

    const description = values.description || "";
    const hasDescription = description.trim().length > 0;

    return (
        <>
            {/* Title */}
            <div className="ctm-field">
                <label className="ctm-label" htmlFor={`${idPrefix}-task-title`}>
                    Title
                </label>
                <input
                    id={`${idPrefix}-task-title`}
                    ref={titleRef}
                    type="text"
                    className={`ctm-input ctm-input-title ${showTitleError ? "has-error" : ""}`}
                    value={values.title}
                    onChange={(event) => onTitleChange?.(event.target.value)}
                    maxLength={255}
                    autoFocus
                />
                {showTitleError && (
                    <span className="ctm-error-text">Title is required.</span>
                )}
            </div>

            {/* Description (preview → modal) */}
            <div className="ctm-field">
                <label
                    className="ctm-label"
                    htmlFor={`${idPrefix}-task-description`}
                >
                    Description
                </label>
                <button
                    type="button"
                    id={`${idPrefix}-task-description`}
                    ref={descriptionTriggerRef}
                    className={`ctm-desc-preview ${hasDescription ? "has-content" : "is-empty"}`}
                    aria-haspopup="dialog"
                    aria-label={
                        hasDescription
                            ? "Edit task description"
                            : "Add a task description"
                    }
                    onClick={openDescription}
                >
                    {hasDescription ? (
                        <span
                            ref={descPanelRef}
                            className="ctm-desc-text"
                            style={{ WebkitLineClamp: DESCRIPTION_CLAMP_LINES }}
                        >
                            {description}
                        </span>
                    ) : (
                        <span className="ctm-desc-placeholder">
                            No description. Click to create one.
                        </span>
                    )}
                    <span className="ctm-desc-affordance" aria-hidden="true">
                        <PenLine size={12} />
                    </span>
                </button>
            </div>

            {/* Labels */}
            <div className="ctm-field">
                <label
                    className="ctm-label"
                    htmlFor={`${idPrefix}-task-label-input`}
                >
                    Labels
                </label>
                <div
                    className="ctm-label-box"
                    onClick={() => labelInputRef.current?.focus()}
                >
                    {values.labels.map((label) => (
                        <span key={label} className="ctm-label-chip">
                            {label}
                            <button
                                type="button"
                                className="ctm-label-chip-remove"
                                aria-label={`Remove label ${label}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    removeLabel(label);
                                }}
                            >
                                <X size={11} />
                            </button>
                        </span>
                    ))}
                    <input
                        id={`${idPrefix}-task-label-input`}
                        ref={labelInputRef}
                        type="text"
                        className="ctm-label-input"
                        value={labelDraft}
                        onChange={(event) => setLabelDraft(event.target.value)}
                        onKeyDown={handleLabelKeyDown}
                        onBlur={commitLabel}
                        placeholder={
                            values.labels.length
                                ? "Add another..."
                                : "Add label (press Enter to add)"
                        }
                        maxLength={40}
                    />
                </div>
            </div>

            {/* Story Points + Original / Remaining Estimate */}
            <div
                className={`ctm-estimates-grid ${
                    mode === "edit" ? "is-triple" : ""
                }`}
            >
                <div className="ctm-field">
                    <label
                        className="ctm-label"
                        htmlFor={`${idPrefix}-task-story-points`}
                    >
                        Story Points
                    </label>
                    <input
                        id={`${idPrefix}-task-story-points`}
                        type="text"
                        className="ctm-input"
                        value={values.storyPoints}
                        onChange={(event) =>
                            patch("storyPoints", event.target.value)
                        }
                        maxLength={50}
                    />
                </div>

                <div className="ctm-field">
                    <label
                        className="ctm-label"
                        htmlFor={`${idPrefix}-task-original-estimate`}
                    >
                        {mode === "edit"
                            ? "Original Est."
                            : "Original Estimate"}
                    </label>
                    <input
                        id={`${idPrefix}-task-original-estimate`}
                        type="text"
                        className="ctm-input"
                        value={values.originalEstimate}
                        onChange={(event) =>
                            patch("originalEstimate", event.target.value)
                        }
                        placeholder="3w 4d 12h"
                        maxLength={50}
                    />
                </div>

                {/* Remaining Estimate chỉ có ở chế độ xem/sửa */}
                {mode === "edit" && (
                    <div className="ctm-field">
                        <label
                            className="ctm-label"
                            htmlFor={`${idPrefix}-task-remaining-estimate`}
                        >
                            Remaining Est.
                        </label>
                        <input
                            id={`${idPrefix}-task-remaining-estimate`}
                            type="text"
                            className="ctm-input"
                            value={values.remainingEstimate}
                            onChange={(event) =>
                                patch("remainingEstimate", event.target.value)
                            }
                            maxLength={50}
                        />
                    </div>
                )}
            </div>
            <small className="ctm-help-text">
                Jira duration, e.g. 3w 4d 12h. A number with no unit is read as
                minutes.
            </small>

            {/* Status & Priority */}
            <div className="ctm-split-row">
                <div className="ctm-field">
                    <span className="ctm-label">Status</span>
                    <div
                        className="ctm-status-grid"
                        role="radiogroup"
                        aria-label="Status"
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                role="radio"
                                aria-checked={values.status === option.id}
                                className={`ctm-status-chip ${
                                    values.status === option.id
                                        ? "is-selected"
                                        : ""
                                }`}
                                onClick={() => patch("status", option.id)}
                            >
                                <span
                                    className={`ctm-dot ${option.dotClass}`}
                                />
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ctm-field">
                    <span className="ctm-label">Priority</span>
                    <div
                        className="ctm-priority-row"
                        role="radiogroup"
                        aria-label="Priority"
                    >
                        {PRIORITY_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                role="radio"
                                aria-checked={values.priority === option.id}
                                className={`ctm-priority-pill ${
                                    values.priority === option.id
                                        ? "is-selected"
                                        : ""
                                }`}
                                onClick={() => patch("priority", option.id)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Assignee */}
            <div className="ctm-field">
                <span className="ctm-label">Assignee</span>
                <div ref={assigneeRef}>
                    <AssigneePicker
                        members={values.members}
                        value={values.assigneeEmail}
                        onChange={(email) => patch("assigneeEmail", email)}
                        placeholder="Assign to..."
                    />
                </div>
            </div>

            <DescriptionModal
                isOpen={isDescriptionOpen}
                initialValue={description}
                initialTab="edit"
                generate={generateDescription}
                context={
                    hasContext
                        ? { title: values.title, projectId: contextProjectId }
                        : null
                }
                onSave={(next) => {
                    patch("description", next);
                    closeDescription();
                }}
                onClose={closeDescription}
            />
        </>
    );
};

export default TaskFormFields;
