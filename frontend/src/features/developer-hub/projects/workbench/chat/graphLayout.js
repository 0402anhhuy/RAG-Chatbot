// Hình học của Agent Map — HÀM THUẦN, không phụ thuộc React.
//
// Bố cục CỐ ĐỊNH trong viewBox 520×520:
//   - hub ở tâm (260, 260), R_HUB
//   - 8 node con trên MỘT vòng tròn, cách đều 45°, chiều kim đồng hồ từ đỉnh
//   - đường nối là đoạn THẲNG từ mép hub tới mép node
// Không force layout, không node trôi → cùng input luôn ra cùng hình.

import { AGENT_MAP_NODES } from "./config/agentMap.js";

export const VIEW_BOX = 520;
export const CENTER = VIEW_BOX / 2;

// Chừa lề trong viewBox cho nhãn ngoài node (nhãn dài nhất ~46px mỗi bên).
// Tâm hình giữ tại CENTER nên đường nối/hub luôn ổn định.
export const LABEL_PADDING = 46;

export const R_HUB = 26;
export const R_NODE = 18;
export const RING_GAP = 5; // khoảng giữa mép node và ring progress
export const R_RING = R_NODE + RING_GAP;
export const ORBIT_RADIUS = 178;
// Bán kính cần vẽ để chứa cả node, ring và nhãn.
export const EXTENT = ORBIT_RADIUS + R_RING + LABEL_PADDING;

const DEG_TO_RAD = Math.PI / 180;

/** Góc của slot index: 0 = 12 giờ (-90°), tăng dần theo chiều kim đồng hồ. */
export const angleOfSlot = (index) => -90 + index * 45;

export const positionOfSlot = (index) => {
    const rad = angleOfSlot(index) * DEG_TO_RAD;
    return {
        x: CENTER + ORBIT_RADIUS * Math.cos(rad),
        y: CENTER + ORBIT_RADIUS * Math.sin(rad),
        angle: angleOfSlot(index),
    };
};

/** Vị trí 8 node theo đúng thứ tự khai báo trong config. */
export const NODE_POSITIONS = AGENT_MAP_NODES.map((node, index) => ({
    id: node.id,
    index,
    ...positionOfSlot(index),
}));

export const HUB_POSITION = { x: CENTER, y: CENTER };

/** Start/end của đoạn nối trên đường tâm→tâm, đã cắt đúng mép hai node. */
export const straightEdge = (from, to, fromRadius, toRadius) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    return {
        x1: from.x + ux * fromRadius,
        y1: from.y + uy * fromRadius,
        x2: to.x - ux * toRadius,
        y2: to.y - uy * toRadius,
    };
};

/** Đoạn nối hub → node (mép hub tới mép node). */
export const edgeToNode = (nodePosition) =>
    straightEdge(HUB_POSITION, nodePosition, R_HUB, R_NODE);

/**
 * Đặt nhãn ngoài node: lệch theo hướng bán kính để không đè hub/đường nối.
 * Trả về anchor chữ để nhãn không tràn ra ngoài khung.
 */
export const labelAnchorOf = (nodePosition) => {
    const rad = nodePosition.angle * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const ring = R_RING + 12;
    return {
        x: CENTER + (ORBIT_RADIUS + ring) * cos,
        y: CENTER + (ORBIT_RADIUS + ring) * sin,
        textAnchor: Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end",
        dominantBaseline:
            Math.abs(sin) < 0.2 ? "middle" : sin > 0 ? "hanging" : "auto",
    };
};

/** Vòng tròn progress: circumference + dash offset theo phần trăm. */
export const ringGeometry = (radius) => {
    const circumference = 2 * Math.PI * radius;
    return {
        radius,
        circumference,
        dashOffset: (percent = 0) =>
            circumference * (1 - Math.min(1, Math.max(0, percent / 100))),
    };
};
