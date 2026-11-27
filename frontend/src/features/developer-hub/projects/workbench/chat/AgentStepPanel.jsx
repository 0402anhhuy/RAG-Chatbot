import { AlertTriangle, Check, Loader2, X } from "lucide-react";

const STATUS_LABEL = {
    running: "Running",
    ok: "Done",
    error: "Failed",
    stopped: "Stopped",
};

/**
 * Chi tiết một node khi hover/click: danh sách step theo ĐÚNG thứ tự chạy
 * (tên tool, file, trạng thái). Không thêm dữ liệu suy diễn ngoài steps của turn.
 */
const AgentStepPanel = ({ meta, node, onClose }) => {
    if (!meta || !node) return null;
    const { Icon, color, label } = meta;

    return (
        <aside
            className="agent-detail-panel"
            style={{ "--node-color": color }}
            aria-label={`${label} steps`}
        >
            <header className="agent-detail-head">
                <span className="agent-detail-dot" />
                <Icon size={13} style={{ color }} />
                <div className="agent-detail-titles">
                    <strong>{label}</strong>
                    <small>
                        {node.count} step{node.count === 1 ? "" : "s"} ·{" "}
                        {node.status}
                    </small>
                </div>
                <button
                    type="button"
                    className="btn-icon-ghost"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <X size={13} />
                </button>
            </header>

            <div className="agent-detail-body">
                {node.steps.length === 0 && (
                    <p className="agent-detail-empty">
                        This node was not used in this turn.
                    </p>
                )}
                <ol className="agent-step-list">
                    {node.steps.map((step, index) => (
                        <li
                            key={`${step.stepId}-${index}`}
                            className={`agent-step-row ${step.status}`}
                        >
                            <span className="agent-step-index">
                                {index + 1}
                            </span>
                            <span className="agent-step-main">
                                <strong>{step.tool || step.nodeType}</strong>
                                {step.file && <small>{step.file}</small>}
                            </span>
                            <span className="agent-step-state">
                                {step.status === "running" ? (
                                    <Loader2 size={10} className="agent-spin" />
                                ) : step.status === "error" ? (
                                    <>
                                        <AlertTriangle size={10} />
                                        <em>{STATUS_LABEL.error}</em>
                                    </>
                                ) : step.status === "stopped" ? (
                                    <em>{STATUS_LABEL.stopped}</em>
                                ) : (
                                    <Check size={10} />
                                )}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </aside>
    );
};

export default AgentStepPanel;
