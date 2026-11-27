import { useEffect, useRef } from "react";

/**
 * Galaxy — bản đồ "chòm sao" của workspace: mỗi folder cấp 1 là một cụm,
 * file là các ngôi sao quay chậm quanh hub của cụm. Bấm vào sao để mở file
 * trong IDE. Toàn bộ dữ liệu lấy từ danh sách file thật của BE, màu lấy từ
 * theme token. Không thêm dependency ngoài canvas.
 */

const readThemeColors = () => {
    const styles = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    return {
        accent: pick("--accent", "#4493f8"),
        violet: pick("--violet", "#a78bfa"),
        text: pick("--text-primary", "#e6edf3"),
        faint: pick("--text-faint", "#656d76"),
    };
};

// Màu của từng cụm theo thứ tự vòng tròn (token: accent / violet xen kẽ)
const CLUSTER_HUES = ["accent", "violet", "accent", "violet", "accent", "violet", "accent"];

const hashPosition = (seed) => {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
};

const WorkbenchGalaxy = ({ files = [], onOpenFile }) => {
    const canvasRef = useRef(null);
    const filesRef = useRef(files);
    const openRef = useRef(onOpenFile);

    filesRef.current = files;
    openRef.current = onOpenFile;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const ctx = canvas.getContext("2d");
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        let width = 0;
        let height = 0;
        let rafId = 0;
        let running = true;
        let rotation = 0;
        let nodes = [];
        let clusters = [];
        let pointer = { x: -9999, y: -9999 };
        let hovered = null;

        // Dựng các cụm: folder cấp 1 (hoặc "root" cho file nằm gốc)
        const buildClusters = () => {
            const list = filesRef.current;
            const groups = new Map();
            list.forEach((file) => {
                const top = file.path.includes("/") ? file.path.split("/")[0] : "root";
                if (!groups.has(top)) groups.set(top, []);
                groups.get(top).push(file);
            });
            const names = [...groups.keys()].sort();
            const cx = width / 2;
            const cy = height / 2;
            const ringRadius = Math.min(width, height) * 0.34;

            clusters = names.map((name, index) => {
                const angle = (index / names.length) * Math.PI * 2 - Math.PI / 2;
                return {
                    name,
                    color: CLUSTER_HUES[index % CLUSTER_HUES.length],
                    cx: cx + Math.cos(angle) * ringRadius,
                    cy: cy + Math.sin(angle) * ringRadius,
                    files: groups.get(name),
                    seed: index + 1,
                };
            });

            // Mỗi file một vị trí quỹ đạo riêng quanh hub cụm
            nodes = [];
            clusters.forEach((cluster) => {
                cluster.files.forEach((file, fileIndex) => {
                    const seedAngle = hashPosition(cluster.seed * 97 + fileIndex * 13) * Math.PI * 2;
                    const seedRadius = hashPosition(cluster.seed * 31 + fileIndex * 7);
                    nodes.push({
                        file,
                        cluster,
                        orbitRadius: 34 + seedRadius * Math.min(78, ringRadius * 0.42),
                        baseAngle: seedAngle,
                        angularSpeed: 0.00035 + seedRadius * 0.0004,
                        size: 1.6 + Math.min(2.4, Math.log2((file.lineCount || 1) + 1) * 0.5),
                        x: 0,
                        y: 0,
                    });
                });
            });
        };

        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            const { accent, violet, text, faint } = readThemeColors();
            const hubColor = (key) => (key === "violet" ? violet : accent);
            const cx = width / 2;
            const cy = height / 2;

            // Lõi trung tâm: project workspace
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = faint;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.12;
            ctx.beginPath();
            ctx.arc(cx, cy, 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = text;
            ctx.font = "600 11px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("workspace", cx, cy + 30);

            // Liên kết hub cụm → lõi
            ctx.globalAlpha = 0.14;
            clusters.forEach((cluster) => {
                ctx.strokeStyle = hubColor(cluster.color);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cluster.cx, cluster.cy);
                ctx.stroke();
            });

            // Sao + liên kết tới hub
            hovered = null;
            nodes.forEach((node) => {
                const angle = node.baseAngle + rotation * node.angularSpeed * 1000;
                node.x = node.cluster.cx + Math.cos(angle) * node.orbitRadius;
                node.y = node.cluster.cy + Math.sin(angle) * node.orbitRadius * 0.82;

                const dist = Math.hypot(node.x - pointer.x, node.y - pointer.y);
                const isHover = dist < 9;
                if (isHover) hovered = node;

                // line to hub
                ctx.globalAlpha = isHover ? 0.55 : 0.2;
                ctx.strokeStyle = hubColor(node.cluster.color);
                ctx.lineWidth = isHover ? 1.2 : 0.7;
                ctx.beginPath();
                ctx.moveTo(node.cluster.cx, node.cluster.cy);
                ctx.lineTo(node.x, node.y);
                ctx.stroke();

                // star
                ctx.globalAlpha = node.file.editedByUser ? 1 : isHover ? 0.95 : 0.72;
                ctx.fillStyle = node.file.editedByUser ? accent : text;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size + (isHover ? 1.4 : 0), 0, Math.PI * 2);
                ctx.fill();

                if (node.file.editedByUser) {
                    ctx.globalAlpha = 0.25;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.size + 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Hub cụm + nhãn
            ctx.textAlign = "center";
            clusters.forEach((cluster) => {
                ctx.globalAlpha = 0.95;
                ctx.fillStyle = hubColor(cluster.color);
                ctx.beginPath();
                ctx.arc(cluster.cx, cluster.cy, 3.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 0.16;
                ctx.beginPath();
                ctx.arc(cluster.cx, cluster.cy, 9, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = 0.85;
                ctx.fillStyle = faint;
                ctx.font = "600 10px 'JetBrains Mono', monospace";
                ctx.fillText(
                    `${cluster.name} · ${cluster.files.length}`,
                    cluster.cx,
                    cluster.cy + 20,
                );
            });

            // Tooltip hover
            if (hovered) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = text;
                ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
                ctx.textAlign = "left";
                ctx.fillText(hovered.file.path, 14, height - 14);
                canvas.style.cursor = "pointer";
            } else {
                canvas.style.cursor = "default";
            }

            ctx.globalAlpha = 1;
        };

        const step = () => {
            rotation += 1;
            draw();
            if (running && !reducedMotion) {
                rafId = requestAnimationFrame(step);
            }
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildClusters();
            if (reducedMotion) draw();
        };

        const onPointerMove = (event) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = event.clientX - rect.left;
            pointer.y = event.clientY - rect.top;
            if (reducedMotion) draw();
        };

        const onClick = () => {
            if (hovered?.file) {
                openRef.current?.(hovered.file);
            }
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

        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        canvas.addEventListener("pointermove", onPointerMove, { passive: true });
        canvas.addEventListener("pointerdown", onClick);
        canvas.addEventListener("pointerleave", () => {
            pointer.x = -9999;
            pointer.y = -9999;
        });
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            running = false;
            cancelAnimationFrame(rafId);
            observer.disconnect();
            canvas.removeEventListener("pointermove", onPointerMove);
            canvas.removeEventListener("pointerdown", onClick);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    return <canvas ref={canvasRef} className="wb-galaxy-canvas" aria-hidden="true" />;
};

export default WorkbenchGalaxy;
