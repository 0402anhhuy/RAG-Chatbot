import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { R_NODE, R_RING, labelAnchorOf, ringGeometry } from "./graphLayout.js";

const NODE_RING = ringGeometry(R_RING);

// Icon không xoay — chỉ RING xoay quanh node (theo yêu cầu).
const iconClass = () => "agent-node-icon";

/**
 * Một node con của Agent Map.
 *
 * Trạng thái (từ engine):
 *   idle      → opacity 0.3, không ring
 *   receiving → sáng, có beam đang tới (ring chưa xoay)
 *   running   → ring xoay quanh node
 *   done      → SÁNG RÕ: ring đầy 100%, chữ và icon opacity 1, giữ màu riêng
 *   error     → ring đỏ + icon cảnh báo (không chỉ dựa vào màu)
 *
 * Badge ×N hiển thị khi node được dùng nhiều lần trong cùng một turn.
 */

const AgentNode = memo(function AgentNode({
    node,
    meta,
    position,
    selected,
    onSelect,
    onHover,
    reducedMotion = false,
}) {
    const { Icon, color, label } = meta;
    const state = node.status;
    const used = state !== "idle";
    const failed = state === "error";
    const running = state === "running" || state === "receiving";
    const percent = state === "done" ? 100 : (node.percent ?? 0);
    const anchor = labelAnchorOf(position);
    const showRing = used && !reducedMotion;

    return (
        <g
            className={`agent-node state-${state} ${selected ? "is-selected" : ""}`}
            style={{ "--node-color": color }}
            transform={`translate(${position.x} ${position.y})`}
            opacity={used ? 1 : 0.3}
            onPointerEnter={() => onHover?.(node.id)}
            onPointerLeave={() => onHover?.(null)}
        >
            {/* Vùng bắt tương tác chỉ bằng đúng đường tròn node — không dùng bbox của chữ */}
            <circle
                r={R_NODE + 6}
                className="agent-node-hit"
                role="button"
                aria-label={`${label} — ${state}${node.count > 1 ? ` ×${node.count}` : ""}`}
                tabIndex={0}
                onClick={() => onSelect?.(node.id)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect?.(node.id);
                    }
                }}
            />

            <circle r={R_NODE} className="agent-node-disc" />
            <circle
                r={R_NODE}
                className="agent-node-border"
                stroke={failed ? "#ef4444" : color}
                strokeWidth="0.75"
            />

            {/* Progress ring: cùng kiểu cho mọi node; idle thì không có ring */}
            {showRing && (
                <circle
                    r={R_RING}
                    className={`agent-node-progress ${running ? "is-spinning" : ""}`}
                    stroke={failed ? "#ef4444" : color}
                    strokeWidth="1.75"
                    strokeDasharray={NODE_RING.circumference}
                    strokeDashoffset={
                        running && node.percent == null
                            ? NODE_RING.circumference * 0.25
                            : NODE_RING.dashOffset(percent)
                    }
                    /* Bắt đầu cung ở 12 giờ (xoay quanh tâm node, không dùng CSS transform) */
                    transform="rotate(-90)"
                />
            )}

            <Icon
                size={16}
                className={iconClass(state)}
                x={-8}
                y={-8}
                color={failed ? "#f87171" : color}
            />

            {/* Lỗi: icon cảnh báo tách biệt, không phụ thuộc màu */}
            {failed && (
                <AlertTriangle
                    size={9}
                    className="agent-node-warn"
                    x={8}
                    y={-15}
                    color="#f87171"
                />
            )}

            {node.count > 1 && (
                <>
                    <circle
                        r="7.5"
                        cx={R_NODE - 1}
                        cy={-(R_NODE - 1)}
                        className="agent-node-badge"
                    />
                    <text
                        className="agent-node-badge-text"
                        x={R_NODE - 1}
                        y={-(R_NODE - 3.5)}
                    >
                        ×{node.count}
                    </text>
                </>
            )}

            <text
                className="agent-node-label"
                x={anchor.x - position.x}
                y={anchor.y - position.y}
                textAnchor={anchor.textAnchor}
                dominantBaseline={anchor.dominantBaseline}
            >
                {label}
            </text>
        </g>
    );
});

export default AgentNode;
