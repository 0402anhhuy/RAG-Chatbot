import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap.js";
import { markdownToHtml } from "@/features/developer-hub/projects/workbench/helpers/markdown.js";
import "@/features/developer-hub/projects/modals/kanban-task/DescriptionModal.css";

/**
 * Modal "Generate Task Description" — lớp trên của form task.
 *
 * Luồng: mô tả yêu cầu (trái) → Generate → kết quả ở tab Edit/Preview (phải)
 * → Save đưa nội dung về ô Description của form. Task chỉ lưu khi bấm
 * Create Task / Save Changes ở form phía dưới.
 *
 * Không đổi form khi Cancel / X / Esc (chỉ hỏi lại nếu có thay đổi chưa lưu).
 */

const CONFIRM_OVERWRITE = "overwrite";
const CONFIRM_DISCARD = "discard";

const DescriptionModal = ({
    isOpen,
    initialValue = "",
    initialTab = "edit",
    onSave,
    onClose,
    generate,
    /** Ngữ cảnh thêm từ form (title, projectId) — chỉ chuyển tiếp cho `generate`. */
    context = null,
}) => {
    const [prompt, setPrompt] = useState("");
    const [draft, setDraft] = useState(initialValue);
    const [tab, setTab] = useState(initialTab);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [confirm, setConfirm] = useState(null); // null | "overwrite" | "discard"
    const [state, setState] = useState("idle"); // idle | loading | ready | error

    const cardRef = useRef(null);
    const promptRef = useRef(null);
    const saveRef = useRef(null);
    const requestRef = useRef(0);
    const aliveRef = useRef(true);

    // Mở lại: nạp nội dung hiện có của form, reset mọi trạng thái tạm.
    useEffect(() => {
        if (!isOpen) return;
        aliveRef.current = true;
        requestRef.current += 1;
        setDraft(initialValue || "");
        setTab(initialTab === "preview" ? "preview" : "edit");
        setPrompt("");
        setError("");
        setConfirm(null);
        setIsGenerating(false);
        setState("idle");
        return () => {
            // Đóng modal khi đang generate → bỏ qua kết quả trả về sau đó.
            aliveRef.current = false;
            requestRef.current += 1;
        };
        // Chỉ chạy khi mở/đóng, không reset khi gõ
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const dirty = draft !== (initialValue || "");
    const canGenerate = prompt.trim().length > 0 && !isGenerating;

    const previewHtml = useMemo(
        () => (tab === "preview" && draft.trim() ? markdownToHtml(draft) : ""),
        [tab, draft],
    );

    // ---- actions -----------------------------------------------------------

    const runGenerate = async () => {
        if (!canGenerate) return;
        if (draft.trim()) {
            setConfirm(CONFIRM_OVERWRITE);
            return;
        }
        await doGenerate();
    };

    const doGenerate = async () => {
        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        setConfirm(null);
        setError("");
        setIsGenerating(true);
        setState("loading");
        try {
            const result = await generate({
                prompt: prompt.trim(),
                current: draft,
                ...(context || {}),
            });
            if (!aliveRef.current || requestRef.current !== requestId) return;
            if (typeof result !== "string" || !result.trim()) {
                throw new Error("The generator returned an empty description.");
            }
            setDraft(result);
            setTab("edit");
            setState("ready");
        } catch (err) {
            if (!aliveRef.current || requestRef.current !== requestId) return;
            // Giữ nguyên yêu cầu đã nhập và nội dung cũ.
            setError(
                err?.message ||
                    "Could not generate a description. Please try again.",
            );
            setState("error");
        } finally {
            if (aliveRef.current && requestRef.current === requestId)
                setIsGenerating(false);
        }
    };

    const requestClose = () => {
        if (dirty) {
            setConfirm(CONFIRM_DISCARD);
            return;
        }
        onClose?.();
    };

    const handleSave = () => {
        onSave(draft);
    };

    useFocusTrap({
        containerRef: cardRef,
        active: isOpen && !confirm,
        initialFocusRef: promptRef,
        onEscape: () => {
            if (confirm) {
                setConfirm(null);
                return;
            }
            requestClose();
        },
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="dm-overlay" role="presentation">
            <div
                ref={cardRef}
                className="dm-card"
                role="dialog"
                aria-modal="true"
                aria-label="Generate Task Description"
            >
                <header className="dm-header">
                    <div className="dm-heading">
                        <h3>Generate Task Description</h3>
                        <p>
                            Describe what the task should do, then generate a
                            structured description.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="dm-close"
                        onClick={requestClose}
                        aria-label="Close generate description"
                    >
                        <X size={17} />
                    </button>
                </header>

                <div className="dm-body">
                    {/* ---------- Cột trái: yêu cầu ---------- */}
                    <section
                        className="dm-pane dm-pane-prompt"
                        aria-label="Task requirements"
                    >
                        <label className="dm-eyebrow" htmlFor="dm-prompt">
                            What should this task do?
                        </label>
                        <textarea
                            id="dm-prompt"
                            ref={promptRef}
                            className="dm-textarea dm-prompt-input"
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            placeholder="Describe the task requirements, acceptance criteria, or technical context..."
                            disabled={isGenerating}
                        />
                        <div className="dm-prompt-footer">
                            <span className="dm-counter">
                                {prompt.length} chars
                            </span>
                            <button
                                type="button"
                                className="dm-generate"
                                onClick={runGenerate}
                                disabled={!canGenerate}
                            >
                                <Sparkles size={14} />
                                <span>
                                    {isGenerating
                                        ? "Generating..."
                                        : "Generate"}
                                </span>
                            </button>
                        </div>
                    </section>

                    {/* ---------- Cột phải: kết quả ---------- */}
                    <section
                        className="dm-pane dm-pane-result"
                        aria-label="Generated description"
                    >
                        <div
                            className="dm-tabs"
                            role="tablist"
                            aria-label="Description view"
                        >
                            <button
                                type="button"
                                role="tab"
                                id="dm-tab-edit"
                                aria-selected={tab === "edit"}
                                aria-controls="dm-panel-edit"
                                className={`dm-tab ${tab === "edit" ? "is-active" : ""}`}
                                onClick={() => setTab("edit")}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                role="tab"
                                id="dm-tab-preview"
                                aria-selected={tab === "preview"}
                                aria-controls="dm-panel-preview"
                                className={`dm-tab ${tab === "preview" ? "is-active" : ""}`}
                                onClick={() => setTab("preview")}
                            >
                                Preview
                            </button>
                        </div>

                        <div className="dm-result-wrap">
                            {isGenerating && (
                                <div className="dm-loading" role="status">
                                    <span
                                        className="dm-spinner"
                                        aria-hidden="true"
                                    />
                                    <span>Generating description…</span>
                                </div>
                            )}

                            {tab === "edit" ? (
                                <textarea
                                    id="dm-panel-edit"
                                    role="tabpanel"
                                    aria-labelledby="dm-tab-edit"
                                    className="dm-textarea dm-result-input"
                                    value={draft}
                                    onChange={(event) => {
                                        setDraft(event.target.value);
                                        if (error) setError("");
                                    }}
                                    placeholder="Generated description will appear here..."
                                    disabled={isGenerating}
                                />
                            ) : (
                                <div
                                    id="dm-panel-preview"
                                    role="tabpanel"
                                    aria-labelledby="dm-tab-preview"
                                    className="dm-preview"
                                >
                                    {draft.trim() ? (
                                        // markdownToHtml đã escape HTML trước khi render → không chạy script
                                        <div
                                            className="dm-preview-content"
                                            dangerouslySetInnerHTML={{
                                                __html: previewHtml,
                                            }}
                                        />
                                    ) : (
                                        <p className="dm-preview-empty">
                                            Nothing to preview yet. Generate or
                                            write a description first.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="dm-error" role="alert">
                                {error}
                            </p>
                        )}
                    </section>
                </div>

                <footer className="dm-footer">
                    <span className="dm-state-text">
                        {state === "loading"
                            ? "Generating…"
                            : state === "error"
                              ? "Generation failed"
                              : state === "ready"
                                ? "Description generated — review before saving"
                                : ""}
                    </span>
                    <div className="dm-footer-actions">
                        <button
                            type="button"
                            className="dm-btn-ghost"
                            onClick={requestClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            ref={saveRef}
                            className="dm-btn-primary"
                            onClick={handleSave}
                            disabled={!dirty || isGenerating}
                        >
                            Save
                        </button>
                    </div>
                </footer>

                {confirm && (
                    <div className="dm-confirm-overlay" role="presentation">
                        <div
                            className="dm-confirm"
                            role="alertdialog"
                            aria-modal="true"
                            aria-label="Confirm"
                        >
                            <p>
                                {confirm === CONFIRM_OVERWRITE
                                    ? "Generating will replace the current description. Continue?"
                                    : "You have unsaved changes. Discard them?"}
                            </p>
                            <div className="dm-confirm-actions">
                                <button
                                    type="button"
                                    className="dm-btn-ghost"
                                    onClick={() => setConfirm(null)}
                                >
                                    Keep editing
                                </button>
                                <button
                                    type="button"
                                    className="dm-btn-primary"
                                    onClick={() =>
                                        confirm === CONFIRM_OVERWRITE
                                            ? doGenerate()
                                            : onClose?.()
                                    }
                                >
                                    {confirm === CONFIRM_OVERWRITE
                                        ? "Overwrite"
                                        : "Discard"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default DescriptionModal;
