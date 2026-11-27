// Cấu hình tĩnh của Agent Map — MỘT nguồn duy nhất cho bố cục, màu, icon và
// cách map event/tool sang 8 loại node.
//
// Quy tắc bố cục (không đổi lúc chạy):
//   - 8 node cố định, cách đều 45°, chiều kim đồng hồ từ đỉnh.
//   - Chỉ nối node con với node trung tâm; không nối node con với nhau.
//   - Thứ tự trong AGENT_MAP_NODES chính là thứ tự vòng tròn.

import {
    Brain,
    BookOpen,
    CircleCheckBig,
    FileText,
    GitBranch,
    Hammer,
    MessageSquare,
    Workflow,
} from "lucide-react";
import { PART_TYPE } from "../chatParts.js";

/** Thứ tự slot: 12 giờ, rồi theo chiều kim đồng hồ. */
export const AGENT_MAP_NODES = [
    {
        id: "thinking",
        label: "Thinking",
        color: "#a78bfa",
        Icon: Brain,
        matchers: [/^think/i, /^reason/i],
    },
    {
        id: "response",
        label: "Response",
        color: "#34d399",
        Icon: MessageSquare,
        // Response là part TEXT — không map qua tên tool.
        matchers: [],
    },
    {
        id: "build",
        label: "Build",
        color: "#fb923c",
        Icon: Hammer,
        matchers: [
            /^build/i,
            /^compile/i,
            /^package/i,
            /^bundle/i,
            /^webpack/i,
            /^gradle/i,
        ],
    },
    {
        id: "files",
        label: "Files",
        color: "#38bdf8",
        Icon: FileText,
        matchers: [
            /^(read_file|read|cat|open|view_file|list_dir|list_files|ls|glob|grep|search|find)/i,
            /(^|_)(edit|write|patch|apply|replace|create|delete|move|rename)(_|$)/i,
            /(file|dir|folder)/i,
        ],
    },
    {
        id: "subagent",
        label: "Agent",
        color: "#f472b6",
        Icon: BookOpen,
        matchers: [/^(task|agent|subagent|delegate|spawn)/i, /(^|_)(sub_?agent)(_|$)/i],
    },
    {
        id: "skill",
        label: "Skill",
        color: "#c084fc",
        Icon: CircleCheckBig,
        matchers: [/^(use_skill|skill|plugin|mcp|tool_call)/i, /(^|_)skill(_|$)/i],
    },
    {
        id: "workflow",
        label: "Workflow",
        color: "#22d3ee",
        Icon: Workflow,
        matchers: [/^(workflow|pipeline|orchestrat|plan|schedule|ci)(_|$)/i, /(^|_)workflow(_|$)/i],
    },
    {
        id: "test",
        label: "Test",
        color: "#facc15",
        Icon: GitBranch,
        matchers: [
            /^(test|spec|jest|vitest|pytest|mocha|run_tests?)(_|$)/i,
            /(^|_)test(s)?(_|$)/i,
        ],
    },
];

/** Tra nhanh theo id. */
export const AGENT_MAP_BY_ID = Object.fromEntries(
    AGENT_MAP_NODES.map((node) => [node.id, node]),
);

/** Node trung tâm. */
export const AGENT_HUB = {
    id: "hub",
    label: "Agent",
    color: "#38bdf8",
    doneColor: "#34d399",
    failedColor: "#ef4444",
};

/** Màu trung tính cho thứ chưa dùng (đường nối xám). */
export const AGENT_IDLE_COLOR = "#94a3b8";

/**
 * Map tên tool → id node trong 8 loại.
 * Không nhận diện được → null (KHÔNG tự gán bừa); caller ghi log.
 */
export const resolveNodeType = (name) => {
    const tool = String(name || "").trim();
    if (!tool) return null;
    const found = AGENT_MAP_NODES.find((node) =>
        node.matchers.some((matcher) => matcher.test(tool)),
    );
    return found ? found.id : null;
};

/** Part (thinking/text/tool) → id node. */
export const nodeIdOfPart = (part) => {
    if (!part) return null;
    if (part.type === PART_TYPE.THINKING) return "thinking";
    if (part.type === PART_TYPE.TEXT) return "response";
    return resolveNodeType(part.name);
};

/** stepId của một part: part do stream thật cấp id, fallback theo vị trí. */
export const stepIdOfPart = (part, index) => part?.id || `step-${index}`;

// ------------------------------------------------------------------ timings

export const TIMING = Object.freeze({
    beamOut: 650, // step_start: tâm → node
    beamLoop: 900, // running: bắn qua lại mỗi 900ms
    beamBack: 650, // step_end: node → tâm
    revealMaxWait: 90000, // chờ stream nếu event heuristic (event nguồn chưa tới)
});

// -------------------------------------------------------------- event shape
//
// Engine (state/agentMapState.js) ưu tiên bộ event chuẩn:
//   { type: "step_start",    stepId, nodeType, tool?, file? }
//   { type: "step_progress", stepId, percent?, message? }      (tuỳ chọn)
//   { type: "step_end",      stepId, status: "ok"|"error", percent? }
//   { type: "turn_end",      status: "ok"|"error", percent? }
// và tự suy ra cùng bộ event đó từ parts của chat khi stream chưa phát chúng
// (xem buildTurnEvents / withBeamScheduling).
