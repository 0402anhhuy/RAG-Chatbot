import { useEffect, useRef } from "react";
import "./TriangleField.css";

/**
 * Background "triangle web" cho trang Overview — dựng lại theo phong cách
 * preset triangles của tsParticles (particles nối line, chốt bằng tam giác
 * mờ), nhưng tự viết bằng canvas để: đổi màu theo theme token, tốc độ chậm,
 * dừng khi tab ẩn và không thêm dependency.
 *
 * Tham số gốc của preset: 100 hạt · link 125px · tam giác opacity 0.1 ·
 * speed 5. Ở đây: speed 0.35 (chậm), màu lấy từ --accent/--violet/--text-primary.
 */

const LINK_DIST = 130;
const MOUSE_DIST = 170;
const BASE_SPEED = 0.35;
const MAX_PARTICLES = 110;

const readThemeColors = () => {
    const styles = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    return {
        accent: pick("--accent", "#38bdf8"),
        violet: pick("--violet", "#a78bfa"),
        dot: pick("--text-primary", "#e6edf3"),
    };
};

/**
 * @param {number} density - hệ số nhân số hạt (1 = mặc định như Overview)
 * @param {number} vivid   - hệ số đậm màu line/tam giác/dot
 */
const TriangleField = ({ density = 1, vivid = 1 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const ctx = canvas.getContext("2d");
        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        let particles = [];
        let width = 0;
        let height = 0;
        let rafId = 0;
        let running = true;
        const pointer = { x: -9999, y: -9999 };

        const seed = () => {
            const count = Math.min(
                Math.round(MAX_PARTICLES * density),
                Math.max(40, Math.round((width * height) / 18000 * density)),
            );
            particles = Array.from({ length: count }, () => {
                const angle = Math.random() * Math.PI * 2;
                const speed = BASE_SPEED * (0.7 + Math.random() * 0.6);
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                };
            });
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        };

        const drawFrame = () => {
            ctx.clearRect(0, 0, width, height);
            const { accent, violet, dot } = readThemeColors();
            const n = particles.length;

            // links: cặp hạt trong khoảng LINK_DIST — vẽ line mờ dần theo khoảng cách
            const adjacency = new Uint8Array(n * n);
            const pairs = [];
            for (let i = 0; i < n; i += 1) {
                const a = particles[i];
                for (let j = i + 1; j < n; j += 1) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    if (dx * dx + dy * dy > LINK_DIST * LINK_DIST) continue;
                    adjacency[i * n + j] = 1;
                    adjacency[j * n + i] = 1;
                    pairs.push(i, j);
                }
            }

            ctx.lineWidth = 0.7;
            for (let p = 0; p < pairs.length; p += 2) {
                const i = pairs[p];
                const j = pairs[p + 1];
                const a = particles[i];
                const b = particles[j];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                const alpha = (1 - dist / LINK_DIST) * 0.15 * vivid;
                ctx.strokeStyle = accent;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }

            // triangles: bộ ba hạt kết nối kín — fill xen kẽ accent / violet
            ctx.globalAlpha = 1;
            for (let p = 0; p < pairs.length; p += 2) {
                const i = pairs[p];
                const j = pairs[p + 1];
                for (let k = j + 1; k < n; k += 1) {
                    if (!adjacency[i * n + k] || !adjacency[j * n + k]) continue;
                    const a = particles[i];
                    const b = particles[j];
                    const c = particles[k];
                    ctx.fillStyle = (i + j + k) % 2 ? violet : accent;
                    ctx.globalAlpha = 0.045 * vivid;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.lineTo(c.x, c.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // pointer grab: nối chuột tới hạt lân cận
            if (pointer.x >= 0) {
                ctx.strokeStyle = accent;
                ctx.lineWidth = 0.6;
                for (let i = 0; i < n; i += 1) {
                    const a = particles[i];
                    const dist = Math.hypot(a.x - pointer.x, a.y - pointer.y);
                    if (dist > MOUSE_DIST) continue;
                    ctx.globalAlpha = (1 - dist / MOUSE_DIST) * 0.12 * vivid;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(pointer.x, pointer.y);
                    ctx.stroke();
                }
            }

            // dots
            ctx.fillStyle = dot;
            for (let i = 0; i < n; i += 1) {
                const a = particles[i];
                ctx.globalAlpha = Math.min(0.85, 0.4 * vivid);
                ctx.beginPath();
                ctx.arc(a.x, a.y, 1.1, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        };

        const step = () => {
            for (let i = 0; i < particles.length; i += 1) {
                const a = particles[i];
                a.x += a.vx;
                a.y += a.vy;
                if (a.x < -8) a.x = width + 8;
                if (a.x > width + 8) a.x = -8;
                if (a.y < -8) a.y = height + 8;
                if (a.y > height + 8) a.y = -8;
            }
            drawFrame();
            if (running && !reducedMotion) {
                rafId = requestAnimationFrame(step);
            }
        };

        const onPointerMove = (event) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = event.clientX - rect.left;
            pointer.y = event.clientY - rect.top;
        };

        const onPointerLeave = () => {
            pointer.x = -9999;
            pointer.y = -9999;
        };

        const onVisibility = () => {
            if (reducedMotion) return;
            if (document.hidden) {
                running = false;
                cancelAnimationFrame(rafId);
            } else if (!running) {
                running = true;
                rafId = requestAnimationFrame(step);
            }
        };

        resize();
        step();

        const observer = new ResizeObserver(() => {
            resize();
            if (reducedMotion) drawFrame();
        });
        observer.observe(canvas);

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerdown", onPointerMove, { passive: true });
        window.addEventListener("blur", onPointerLeave);
        document.documentElement.addEventListener("pointerleave", onPointerLeave);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            running = false;
            cancelAnimationFrame(rafId);
            observer.disconnect();
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerdown", onPointerMove);
            window.removeEventListener("blur", onPointerLeave);
            document.documentElement.removeEventListener("pointerleave", onPointerLeave);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [density, vivid]);

    return (
        <canvas
            ref={canvasRef}
            className="triangle-field"
            aria-hidden="true"
        />
    );
};

export default TriangleField;
