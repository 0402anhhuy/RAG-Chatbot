import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Waypoints } from "lucide-react";
import AgentBeam from "./AgentBeam.jsx";
import AgentNode from "./AgentNode.jsx";
import AgentStepPanel from "./AgentStepPanel.jsx";
import { groupTurns, PART_TYPE } from "./chatParts.js";
import {
    AGENT_HUB,
    AGENT_IDLE_COLOR,
    AGENT_MAP_BY_ID,
    AGENT_MAP_NODES,
} from "./config/agentMap.js";
import {
    HUB_POSITION,
    NODE_POSITIONS,
    R_HUB,
    RING_GAP,
    VIEW_BOX,
    edgeToNode,
    ringGeometry,
} from "./graphLayout.js";
import { useAgentMap } from "./state/agentMapState.js";
import { useReducedMotion } from "./hooks/useReducedMotion.js";

const HUB_RING = ringGeometry(R_HUB + RING_GAP);

const STEPS = [
    { id: "understand", label: "Understand" },
    { id: "find", label: "Find code" },
    { id: "copilot", label: "Copilot" },
    { id: "check", label: "Check" },
    { id: "ready", label: "Ready" },
];

const TOOL_MATCHERS = {
    find: /(read|list|grep|search|find|open|cat|glob|tree|dir|file)/i,
    copilot:
        /(edit|write|patch|apply|replace|create|delete|move|rename|build|compile)/i,
    check: /(test|lint|build|run|check|typecheck|verify)/i,
};

/** Thanh step phía trên — giữ nguyên hành vi cũ, chỉ đọc parts. */
const stageStates = (parts, runStatus) => {
    const tools = parts.filter((part) => part.type === PART_TYPE.TOOL);
    const stageDone = (matcher) => {
        const matched = tools.filter((part) =>
            matcher.test(String(part.name || "")),
        );
        return (
            matched.length > 0 &&
            matched.every((part) => part.status === "success")
        );
    };
    const flags = [
        Boolean(parts.length),
        stageDone(TOOL_MATCHERS.find),
        stageDone(TOOL_MATCHERS.copilot),
        stageDone(TOOL_MATCHERS.check),
        runStatus === "done",
    ];
    const pendingIndex = flags.findIndex((done) => !done);
    const terminal = runStatus === "error" || runStatus === "stopped";
    const active = ["thinking", "tool", "responding"].includes(runStatus);
    return flags.map((done, index) => {
        if (done) return "done";
        if (index === pendingIndex) {
            if (terminal) return "error";
            return active ? "current" : "pending";
        }
        return "pending";
    });
};

/** Edge màu: xám khi chưa dùng, màu riêng khi đã dùng, đỏ khi lỗi. */
const edgeColorOf = (node) => {
    if (node.status === "error") return "#ef4444";
    if (node.status === "idle") return AGENT_IDLE_COLOR;
    return AGENT_MAP_BY_ID[node.id]?.color || AGENT_IDLE_COLOR;
};

const GraphView = ({
    messages,
    runStatus = "idle",
    emptyState = null,
    showTrace = true,
}) => {
    const turns = useMemo(() => groupTurns(messages), [messages]);
    const [turnIndex, setTurnIndex] = useState(
        turns.length ? turns.length - 1 : 0,
    );
    const [selectedId, setSelectedId] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);
    const reducedMotion = useReducedMotion();

    // Có lượt mới → tự chuyển sang lượt đó
    useEffect(() => {
        if (turns.length) setTurnIndex(turns.length - 1);
    }, [turns.length]);

    const safeIndex = Math.min(
        Math.max(turnIndex, 0),
        Math.max(0, turns.length - 1),
    );
    const turn = turns[safeIndex] || null;
    const assistant = turn?.assistant || null;
    const parts = useMemo(() => assistant?.parts || [], [assistant]);

    // Lượt cuối đang chạy → animate; xem lại lượt cũ → settle, sáng các node đã dùng.
    const isLiveTurn = turns.length > 0 && safeIndex === turns.length - 1;
    const animate =
        isLiveTurn &&
        !["done", "error", "stopped"].includes(runStatus) &&
        Boolean(parts.length);
    const turnKey = `${turn?.id || "none"}:${safeIndex}`;

    const { nodes, hub } = useAgentMap({ parts, runStatus, animate, turnKey });

    const detailId = hoveredId || selectedId;
    const detailNode = detailId ? nodes[detailId] : null;

    // Đổi lượt → bỏ chọn
    useEffect(() => {
        setSelectedId(null);
        setHoveredId(null);
    }, [safeIndex]);

    const canPrev = safeIndex > 0;
    const canNext = safeIndex < turns.length - 1;

    const states = stageStates(parts, runStatus);
    const doneStages = states.filter((state) => state === "done").length;
    const progressIndex = states.includes("current")
        ? states.indexOf("current")
        : states.lastIndexOf("done");
    const progressPercent =
        progressIndex > 0 ? (progressIndex / (STEPS.length - 1)) * 100 : 0;

    const hubColor =
        hub.state === "error"
            ? AGENT_HUB.failedColor
            : hub.state === "done"
              ? AGENT_HUB.doneColor
              : hub.color || AGENT_HUB.color;
    const hubBusy = hub.state === "running" && !reducedMotion;

    return (
        <div className={`agent-graph ${turn && showTrace ? "has-trace" : ""}`}>
            <div className="agent-graph-toolbar">
                <div className="agent-graph-turnnav">
                    <button
                        type="button"
                        className="btn-icon-ghost"
                        onClick={() => setTurnIndex(safeIndex - 1)}
                        disabled={!canPrev}
                        title="Previous turn"
                    >
                        ‹
                    </button>
                    <span>
                        Turn {turns.length ? safeIndex + 1 : 0}/{turns.length} ·{" "}
                        {parts.length} step
                        {parts.length === 1 ? "" : "s"}
                    </span>
                    <button
                        type="button"
                        className="btn-icon-ghost"
                        onClick={() => setTurnIndex(safeIndex + 1)}
                        disabled={!canNext}
                        title="Next turn"
                    >
                        ›
                    </button>
                </div>
            </div>

            {turn && (
                <div className="agent-stepper" aria-label="Agent progress">
                    <div
                        className="agent-stepper-track"
                        style={{ "--stage-progress": `${progressPercent}%` }}
                    >
                        {STEPS.map((step, index) => (
                            <span
                                key={step.id}
                                className={`agent-step ${states[index]}`}
                                data-step={step.id}
                            >
                                <i className="agent-step-dot">
                                    {states[index] === "done" ? (
                                        <Check size={8} />
                                    ) : states[index] === "error" ? (
                                        <AlertTriangle size={8} />
                                    ) : states[index] === "current" ? (
                                        <Loader2
                                            size={8}
                                            className="agent-spin"
                                        />
                                    ) : null}
                                </i>
                                <span>{step.label}</span>
                            </span>
                        ))}
                    </div>
                    <span className="agent-stepper-count">
                        {doneStages}/{STEPS.length} done
                    </span>
                </div>
            )}

            <div className="agent-graph-workbench">
                <div className="agent-graph-stage">
                    {!turn && emptyState}

                    {turn && (
                        <svg
                            className="agent-map-svg"
                            viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
                            preserveAspectRatio="xMidYMid meet"
                            aria-label="Agent map"
                        >
                            {/* Đường nối: thẳng, mép hub → mép node. Chỉ hub với node con. */}
                            {NODE_POSITIONS.map((position) => {
                                const node = nodes[position.id];
                                const edge = edgeToNode(position);
                                return (
                                    <line
                                        key={`edge-${position.id}`}
                                        x1={edge.x1}
                                        y1={edge.y1}
                                        x2={edge.x2}
                                        y2={edge.y2}
                                        className={`agent-edge-line ${node.status}`}
                                        stroke={edgeColorOf(node)}
                                        strokeWidth="0.75"
                                        strokeLinecap="round"
                                    />
                                );
                            })}

                            {/* Beam: chạy đúng trên các đường nối ở trên (tắt khi reduced-motion) */}
                            {!reducedMotion &&
                                NODE_POSITIONS.map((position) => {
                                    const node = nodes[position.id];
                                    if (node.beam.mode === "idle") return null;
                                    const edge = edgeToNode(position);
                                    return (
                                        <AgentBeam
                                            key={`beam-${position.id}`}
                                            x1={edge.x1}
                                            y1={edge.y1}
                                            x2={edge.x2}
                                            y2={edge.y2}
                                            color={edgeColorOf(node)}
                                            mode={node.beam.mode}
                                            token={node.beam.token}
                                        />
                                    );
                                })}

                            {/* Hub */}
                            <g
                                className={`agent-hub state-${hub.state}`}
                                transform={`translate(${HUB_POSITION.x} ${HUB_POSITION.y})`}
                                style={{ "--hub-color": hubColor }}
                            >
                                <circle r={R_HUB} className="agent-hub-disc" />
                                <circle
                                    r={R_HUB + RING_GAP}
                                    className={`agent-hub-progress ${hubBusy ? "is-spinning" : ""}`}
                                    stroke={hubColor}
                                    strokeWidth="1.75"
                                    strokeDasharray={HUB_RING.circumference}
                                    strokeDashoffset={
                                        hub.state === "running" &&
                                        hub.percent == null
                                            ? HUB_RING.circumference * 0.25
                                            : HUB_RING.dashOffset(
                                                  hub.percent ?? 0,
                                              )
                                    }
                                    transform="rotate(-90)"
                                />
                                <Waypoints size={16} x="-8" y="-15" className="agent-hub-icon" />
                                {/* Nhãn nằm TRONG disc: không đè ring, không chạm đường nối */}
                                <text className="agent-hub-label" y={2}>
                                    {AGENT_HUB.label}
                                </text>
                                <text
                                    className="agent-hub-state"
                                    y={14}
                                    fill={
                                        hub.state === "done"
                                            ? AGENT_HUB.doneColor
                                            : hub.state === "error"
                                              ? AGENT_HUB.failedColor
                                              : undefined
                                    }
                                >
                                    {hub.state === "running" && hub.percent != null
                                        ? `${Math.round(hub.percent)}%`
                                        : hub.label}
                                </text>
                            </g>

                            {/* 8 node con — luôn render đủ, vị trí cố định */}
                            {NODE_POSITIONS.map((position) => (
                                <AgentNode
                                    key={position.id}
                                    node={nodes[position.id]}
                                    meta={AGENT_MAP_BY_ID[position.id]}
                                    position={position}
                                    selected={detailId === position.id}
                                    reducedMotion={reducedMotion}
                                    onHover={setHoveredId}
                                    onSelect={(id) =>
                                        setSelectedId((prev) =>
                                            prev === id ? null : id,
                                        )
                                    }
                                />
                            ))}
                        </svg>
                    )}
                </div>

                {turn && showTrace && (
                    <aside className="agent-trace" aria-label="Activity trace">
                        <div className="agent-trace-head">
                            <span>Activity</span>
                            <span className="agent-trace-count">
                                {parts.length} step
                                {parts.length === 1 ? "" : "s"}
                            </span>
                        </div>
                        <div className="agent-trace-list">
                            {parts.length === 0 && (
                                <p className="agent-trace-empty">
                                    Waiting for the first step…
                                </p>
                            )}
                            {parts.map((part, index) => {
                                const nodeType =
                                    part.type === PART_TYPE.TOOL
                                        ? null
                                        : part.type;
                                const color =
                                    nodeType === PART_TYPE.THINKING
                                        ? AGENT_MAP_BY_ID.thinking.color
                                        : AGENT_MAP_BY_ID.response.color;
                                const state =
                                    part.status === "running"
                                        ? "running"
                                        : part.status === "error"
                                          ? "error"
                                          : part.status === "stopped"
                                            ? "stopped"
                                            : "done";
                                return (
                                    <div
                                        key={`trace-${part.id || index}`}
                                        className={`agent-trace-row ${state}`}
                                        style={{ "--trace-color": color }}
                                    >
                                        <span className="agent-trace-main">
                                            <strong>
                                                {part.type === PART_TYPE.TOOL
                                                    ? part.name || "tool"
                                                    : part.type}
                                            </strong>
                                        </span>
                                        <span className="agent-trace-state">
                                            {state === "running" ? (
                                                <Loader2
                                                    size={10}
                                                    className="agent-spin"
                                                />
                                            ) : state === "error" ? (
                                                <AlertTriangle size={10} />
                                            ) : state === "stopped" ? (
                                                <span className="agent-trace-pill">
                                                    stopped
                                                </span>
                                            ) : (
                                                <Check size={10} />
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                )}
            </div>

            {turn && detailNode && (
                <AgentStepPanel
                    meta={AGENT_MAP_BY_ID[detailId]}
                    node={detailNode}
                    onClose={() => {
                        setSelectedId(null);
                        setHoveredId(null);
                    }}
                />
            )}

            {turn && (
                <div className="agent-graph-legend" aria-hidden="true">
                    {AGENT_MAP_NODES.map((node) => (
                        <span key={node.id}>
                            <i
                                className="dot"
                                style={{ background: node.color }}
                            />{" "}
                            {node.label.toLowerCase()}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GraphView;
