// Engine của Agent Map — chuyển dữ liệu chat (parts) thành trạng thái 8 node.
//
// Kiến trúc: dữ liệu vẫn là `parts` của chat (nguồn duy nhất, xem chatParts.js).
// Module này chỉ SUY RA bộ event chuẩn mà prompt yêu cầu:
//   step_start / step_progress / step_end / turn_end
// rồi áp chúng lên 8 node cố định. Nhờ vậy khi backend có SSE thật phát đúng bộ
// event đó, chỉ cần đổi nguồn vào (parts → events) mà không đụng phần render.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AGENT_MAP_BY_ID,
    AGENT_MAP_NODES,
    TIMING,
    nodeIdOfPart,
    resolveNodeType,
    stepIdOfPart,
} from "../config/agentMap.js";

const warnedTools = new Set();

/** Part status → step status của engine. */
const stepStatusOf = (part) => {
    if (part.status === "error") return "error";
    if (part.status === "running") return "running";
    if (part.status === "stopped") return "stopped";
    return "ok";
};

/** Tên file/đường dẫn của một tool call (để hiển thị trong danh sách step). */
export const fileOfPart = (part) => {
    const input = part?.input || {};
    return (
        input.path ||
        input.file ||
        input.command ||
        input.pattern ||
        input.query ||
        ""
    );
};

/**
 * parts → danh sách step theo ĐÚNG thứ tự chạy.
 * Tool không nhận diện được thì ghi log và bỏ qua (không tự gán node).
 */
export const buildSteps = (parts = []) => {
    const steps = [];
    parts.forEach((part, index) => {
        const nodeType = nodeIdOfPart(part);
        if (!nodeType) {
            const tool = String(part?.name || part?.type || "");
            if (tool && !warnedTools.has(tool)) {
                warnedTools.add(tool);
                // Không map được → log rõ ràng, không đoán bừa.
                console.warn(
                    `[AgentMap] Unmapped tool "${tool}" — bỏ qua trên map.`,
                );
            }
            return;
        }
        steps.push({
            stepId: stepIdOfPart(part, index),
            nodeType,
            tool: part.type === "tool" ? part.name || "tool" : part.type,
            file: fileOfPart(part),
            status: stepStatusOf(part),
            startedAt: part.startedAt || null,
            endedAt: part.endedAt || null,
            percent: null,
        });
    });
    return steps;
};

const emptyNode = (id) => ({
    id,
    status: "idle", // idle | receiving | running | done | error
    count: 0,
    steps: [],
    percent: null,
    beam: { mode: "idle", token: 0 },
    lastStartAt: 0,
});

const emptyNodes = () =>
    Object.fromEntries(
        AGENT_MAP_NODES.map((node) => [node.id, emptyNode(node.id)]),
    );

/** Trạng thái tổng của một node khi đã "settle" (không còn animation). */
const settledStatus = (steps) => {
    if (!steps.length) return "idle";
    if (steps.some((step) => step.status === "error")) return "error";
    if (steps.some((step) => step.status === "running")) return "running";
    return "done";
};

/** Dựng model tĩnh từ steps (dùng cho lượt cũ / replay: sáng ngay, không beam). */
export const settleModel = (steps = []) => {
    const nodes = emptyNodes();
    steps.forEach((step) => {
        const node = nodes[step.nodeType];
        if (!node) return;
        node.steps.push(step);
        node.count = node.steps.length;
        node.lastStartAt = Math.max(node.lastStartAt, step.startedAt || 0);
        node.percent = step.percent ?? node.percent;
    });
    Object.values(nodes).forEach((node) => {
        node.status = settledStatus(node.steps);
        node.beam = { mode: "idle", token: 0 };
    });
    return nodes;
};

/**
 * Hub state:
 *  - đang chạy: lấy node đang chạy có step bắt đầu gần nhất (nhiều node song song).
 *  - xong turn: Done (xanh lá); lỗi: Failed.
 */
export const hubStateOf = (nodes, runStatus) => {
    const running = Object.values(nodes)
        .filter(
            (node) => node.status === "running" || node.status === "receiving",
        )
        .sort((a, b) => b.lastStartAt - a.lastStartAt);
    const failed = Object.values(nodes).some((node) => node.status === "error");

    if (running.length) {
        const active = running[0];
        return {
            state: "running",
            color: AGENT_MAP_BY_ID[active.id]?.color,
            percent: active.percent,
            label: AGENT_MAP_BY_ID[active.id]?.label || "Working",
        };
    }
    if (runStatus === "error" || failed) {
        return { state: "error", percent: 100, label: "Failed" };
    }
    if (runStatus === "stopped")
        return { state: "stopped", percent: null, label: "Stopped" };
    if (runStatus === "done")
        return { state: "done", percent: 100, label: "Done" };
    return { state: "idle", percent: null, label: "Idle" };
};

/**
 * Hook chạy animation cho lượt đang hoạt động.
 *
 * - `animate = false` (xem lại lượt cũ): settle ngay, không beam, không timer.
 * - `animate = true`: mỗi step đi qua 3 pha
 *     receiving (beam tâm→node, 650ms) → running (beam qua lại 900ms/đợt)
 *     → khi step_end: beam node→tâm (650ms) → done/error.
 *   Node đã xong VẪN SÁNG cho tới khi turn mới / replay (reset theo `turnKey`).
 */
export const useAgentMap = ({
    parts = [],
    runStatus = "idle",
    animate = false,
    turnKey = "",
}) => {
    const steps = useMemo(() => buildSteps(parts), [parts]);
    const [nodes, setNodes] = useState(() => settleModel(steps));
    const timers = useRef([]);
    const seen = useRef(new Map()); // stepId → status đã áp
    const activeTurn = useRef(turnKey);

    const clearTimers = useCallback(() => {
        timers.current.forEach((id) => window.clearTimeout(id));
        timers.current = [];
    }, []);

    const later = useCallback((fn, ms) => {
        const id = window.setTimeout(fn, ms);
        timers.current.push(id);
    }, []);

    const patchNode = useCallback((nodeId, updater) => {
        setNodes((prev) => {
            const node = prev[nodeId];
            if (!node) return prev;
            const next = updater(node);
            if (next === node) return prev;
            return { ...prev, [nodeId]: next };
        });
    }, []);

    // Turn mới / replay: xoá sạch timer + trạng thái cũ.
    useEffect(() => {
        if (activeTurn.current === turnKey) return;
        activeTurn.current = turnKey;
        clearTimers();
        seen.current = new Map();
        setNodes(emptyNodes());
    }, [turnKey, clearTimers]);

    useEffect(() => () => clearTimers(), [clearTimers]);

    // Đồng bộ steps → nodes.
    useEffect(() => {
        if (!animate) {
            clearTimers();
            setNodes(settleModel(steps));
            return;
        }

        steps.forEach((step) => {
            const node = AGENT_MAP_BY_ID[step.nodeType];
            if (!node) return;
            const applied = seen.current.get(step.stepId);
            const isNew = !applied;
            const justEnded = applied === "running" && step.status !== "running";

            // Không có gì đổi → bỏ qua. Nhờ vậy effect chạy lại (mỗi render sinh
            // mảng steps mới) không đếm trùng hay bắn lại beam.
            if (!isNew && !justEnded && step.percent === applied) return;

            // --- step_start ------------------------------------------------
            if (isNew) {
                seen.current.set(step.stepId, step.status);
                patchNode(step.nodeType, (current) => {
                    // Step đã biết rồi (trùng id) thì chỉ cập nhật, không tăng count.
                    if (current.steps.some((item) => item.stepId === step.stepId)) {
                        return current;
                    }
                    return {
                        ...current,
                        // Node đang xong rồi mà được gọi lại: vẫn sáng, ring đầy lại
                        status: "receiving",
                        count: current.count + 1,
                        steps: [...current.steps, step],
                        lastStartAt: Date.now(),
                        percent: step.percent ?? current.percent,
                        beam: { mode: "out", token: current.beam.token + 1 },
                    };
                });

                // Hạt đầu tiên tới nơi → node "đang chạy", ring xoay.
                later(() => {
                    patchNode(step.nodeType, (current) =>
                        current.status === "receiving"
                            ? {
                                  ...current,
                                  status: "running",
                                  beam: {
                                      mode: "loop",
                                      token: current.beam.token + 1,
                                  },
                              }
                            : current,
                    );
                }, TIMING.beamOut);
                return;
            }

            // --- step_progress (chỉ khi có % thật) -------------------------
            if (!justEnded && step.percent != null && step.percent !== applied) {
                seen.current.set(step.stepId, step.percent);
                patchNode(step.nodeType, (current) => ({
                    ...current,
                    percent: step.percent,
                }));
            }

            // --- step_end --------------------------------------------------
            if (justEnded) {
                seen.current.set(step.stepId, step.status);
                patchNode(step.nodeType, (current) => ({
                    ...current,
                    steps: current.steps.map((item) =>
                        item.stepId === step.stepId
                            ? { ...item, status: step.status }
                            : item,
                    ),
                    beam: { mode: "back", token: current.beam.token + 1 },
                }));

                // Hạt về tới tâm → chốt trạng thái. Node VẪN SÁNG (opacity 1).
                later(() => {
                    patchNode(step.nodeType, (current) => {
                        const doneSteps = current.steps.map((item) =>
                            item.stepId === step.stepId
                                ? { ...item, status: step.status }
                                : item,
                        );
                        const stillRunning = doneSteps.some(
                            (item) => item.status === "running",
                        );
                        return {
                            ...current,
                            steps: doneSteps,
                            status:
                                step.status === "error"
                                    ? "error"
                                    : stillRunning
                                      ? "running"
                                      : "done",
                            beam: stillRunning
                                ? {
                                      mode: "loop",
                                      token: current.beam.token + 1,
                                  }
                                : { mode: "idle", token: current.beam.token },
                        };
                    });
                }, TIMING.beamBack);
            }
        });
    }, [steps, animate, patchNode, later, clearTimers]);

    const hub = useMemo(() => hubStateOf(nodes, runStatus), [nodes, runStatus]);

    return { nodes, hub, steps };
};

/** Tool → node id, re-export để UI/test dùng chung một bảng map. */
export { resolveNodeType };

export default useAgentMap;
