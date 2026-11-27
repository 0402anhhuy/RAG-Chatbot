import { memo, useEffect, useRef } from "react";

/**
 * Hạt beam chạy trên đoạn thẳng hub ⇄ node.
 *
 * Kỹ thuật: SVG <line> cho đường nối + <circle> đầu hạt + <line> đuôi ngắn.
 * Mọi thay đổi vị trí được ghi TRỰC TIẾP qua ref trong requestAnimationFrame,
 * không setState theo frame → React không re-render 60 lần/giây.
 *
 * mode:
 *   out  : step_start — tâm → node, TIMING.beamOut (650ms), chạy một lượt
 *   loop : đang chạy  — qua lại hai chiều, TIMING.beamLoop (900ms/đợt)
 *   back : step_end   — node → tâm, chạy một lượt rồi dừng
 *   idle : không hạt
 *
 * `token` tăng mỗi khi engine chuyển pha → lượt hạt mới bắt đầu lại từ đầu.
 */

const TRAIL_LENGTH = 18; // chiều dài đuôi ngắn phía sau hạt (đơn vị viewBox)
const HEAD_R = 2.5;

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

const AgentBeam = ({
    x1,
    y1,
    x2,
    y2,
    color = "#94a3b8",
    mode = "idle",
    token = 0,
    duration,
    dim = false,
}) => {
    const headRef = useRef(null);
    const trailRef = useRef(null);
    const rafRef = useRef(0);

    useEffect(() => {
        const head = headRef.current;
        const trail = trailRef.current;
        if (!head || !trail) return undefined;

        const hide = () => {
            head.setAttribute("opacity", "0");
            trail.setAttribute("opacity", "0");
        };

        if (mode === "idle" || prefersReducedMotion()) {
            hide();
            return undefined;
        }

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length;
        const uy = dy / length;
        const total = duration || (mode === "loop" ? 900 : 650);

        const place = (progress) => {
            const p = Math.min(1, Math.max(0, progress));
            const hx = x1 + dx * p;
            const hy = y1 + dy * p;
            head.setAttribute("cx", hx);
            head.setAttribute("cy", hy);
            head.setAttribute("opacity", "1");

            // Đuôi nằm NGAY SAU hạt theo hướng bay (đuôi ngắn, không phải cả đường).
            trail.setAttribute("x1", hx);
            trail.setAttribute("y1", hy);
            trail.setAttribute("x2", hx - ux * TRAIL_LENGTH);
            trail.setAttribute("y2", hy - uy * TRAIL_LENGTH);
            trail.setAttribute("opacity", "0.55");
        };

        // stop() dọn rAF — engine đã lo việc "không còn animation nào sau turn_end"
        // bằng cách đưa mode về idle.
        let startAt = performance.now();
        let finished = false;

        const tick = (now) => {
            if (finished) return;
            const elapsed = now - startAt;

            if (mode === "loop") {
                // Qua lại: mỗi đợt duration, đổi chiều khi chạm đầu kia.
                const laps = Math.floor(elapsed / total);
                const phase = (elapsed % total) / total;
                const forward = laps % 2 === 0;
                place(forward ? phase : 1 - phase);
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            // Một lượt: out (0→1) hoặc back (1→0)
            const progress = Math.min(1, elapsed / total);
            place(mode === "back" ? 1 - progress : progress);
            if (progress >= 1) {
                finished = true;
                hide();
                return;
            }
            rafRef.current = requestAnimationFrame(tick);
        };

        // Tab ẩn: dừng vòng lặp, lưu mốc để chạy tiếp (không nhảy cóc).
        let pausedAt = 0;
        const onVisibility = () => {
            if (document.hidden) {
                pausedAt = performance.now();
                cancelAnimationFrame(rafRef.current);
            } else if (pausedAt) {
                startAt += performance.now() - pausedAt;
                pausedAt = 0;
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        place(mode === "back" ? 1 : 0);
        rafRef.current = requestAnimationFrame(tick);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            finished = true;
            cancelAnimationFrame(rafRef.current);
            document.removeEventListener("visibilitychange", onVisibility);
            hide();
        };
    }, [x1, y1, x2, y2, mode, token, duration]);

    const active = mode !== "idle";
    const stroke = dim ? "#94a3b8" : color;

    return (
        <g
            className={`agent-beam ${active ? `mode-${mode}` : ""}`}
            style={{ "--beam-color": color }}
            pointerEvents="none"
        >
            <circle
                ref={headRef}
                r={HEAD_R}
                fill={stroke}
                opacity="0"
                className="agent-beam-head"
            />
            <line
                ref={trailRef}
                x1={x1}
                y1={y1}
                x2={x1}
                y2={y1}
                stroke={stroke}
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity="0"
                className="agent-beam-trail"
            />
        </g>
    );
};

export default memo(AgentBeam);
