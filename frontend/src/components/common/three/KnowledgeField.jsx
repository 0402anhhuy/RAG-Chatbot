import { useEffect, useRef, useState } from "react";
import TriangleField from "../canvas/TriangleField";
import {
    AdditiveBlending,
    BufferGeometry,
    CanvasTexture,
    Color,
    Float32BufferAttribute,
    Group,
    LineBasicMaterial,
    LineSegments,
    NormalBlending,
    PerspectiveCamera,
    Points,
    PointsMaterial,
    Scene,
    Sprite,
    SpriteMaterial,
    WebGLRenderer,
} from "three";
import "./KnowledgeField.css";

/**
 * "Knowledge constellation" — nền WebGL cho Landing page.
 *
 * Ẩn dụ sản phẩm: các chấm nhỏ là tài liệu/đ-srcConcept đang trôi lơ lửng,
 * kèm nhau nối thành lưới kiến thức (line segments), và vài "hub" sáng lớn
 * hơn chính là câu trả lời nổi lên từ lưới. Toàn bộ màu lấy từ theme token
 * (--accent / --violet / --text-faint) nên đổi Light/Dark/Blush đều đúng.
 *
 * Hiệu năng: 1 context WebGL duy nhất, hạt co giãn theo viewport, DPR ≤ 1.75,
 * dừng RAF khi tab ẩn, render 1 khung hình tĩnh khi prefers-reduced-motion,
 * và dispose sạch khi unmount (an toàn với React StrictMode double-mount).
 */

const readToken = (name, fallback) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
};

const isDarkTheme = () => document.documentElement.dataset.theme === "dark";

const makeDotTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.35, "rgba(255, 255, 255, 0.85)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
};

/* Hạt phân bố theo cụm: 5 "chủ đề" giữa không gian + nền tán loang. */
const buildPositions = (count) => {
    const centers = [
        [-5.2, 1.8, -0.6],
        [-1.6, -2.4, 1.2],
        [0.4, 2.6, -1.4],
        [4.6, -1.4, 0.4],
        [6.2, 2.8, -2.0],
    ];
    const positions = new Float32Array(count * 3);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.35;
    for (let i = 0; i < count; i += 1) {
        if (Math.random() < 0.62) {
            const c = centers[Math.floor(Math.random() * centers.length)];
            positions[i * 3] = c[0] + gauss();
            positions[i * 3 + 1] = c[1] + gauss() * 0.72;
            positions[i * 3 + 2] = c[2] + gauss() * 0.8;
        } else {
            positions[i * 3] = (Math.random() - 0.5) * 17;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 9.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 7;
        }
    }
    return { positions, centers };
};

/* Nối mỗi hạt với 2 láng giềng gần nhất (nếu trong ngưỡng) → lưới tri thức. */
const buildLineIndices = (positions, count) => {
    const maxDistSq = 1.9 * 1.9;
    const seen = new Set();
    const indices = [];
    for (let i = 0; i < count; i += 1) {
        const ax = positions[i * 3];
        const ay = positions[i * 3 + 1];
        const az = positions[i * 3 + 2];
        let first = -1;
        let second = -1;
        let firstD = Infinity;
        let secondD = Infinity;
        for (let j = 0; j < count; j += 1) {
            if (j === i) continue;
            const dx = ax - positions[j * 3];
            const dy = ay - positions[j * 3 + 1];
            const dz = az - positions[j * 3 + 2];
            const d = dx * dx + dy * dy + dz * dz;
            if (d < firstD) {
                second = first;
                secondD = firstD;
                first = j;
                firstD = d;
            } else if (d < secondD) {
                second = j;
                secondD = d;
            }
        }
        [first, second].forEach((j, k) => {
            if (j < 0) return;
            const d = k === 0 ? firstD : secondD;
            if (d > maxDistSq) return;
            const key = i < j ? `${i}:${j}` : `${j}:${i}`;
            if (seen.has(key)) return;
            seen.add(key);
            indices.push(i, j);
        });
    }
    return indices.slice(0, 3200);
};

const KnowledgeField = () => {
    const canvasRef = useRef(null);
    const [webglFailed, setWebglFailed] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || webglFailed) return undefined;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const dark = isDarkTheme();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;

        /* Một số máy/browser tắt WebGL (máy ảo, driver cũ, policy…) —
           probe trên canvas ẩn trước để không đổ console error, rồi mới
           khởi tạo renderer. Fail → fallback 2D field, không trắng trang. */
        const glAttrs = { alpha: true, antialias: true };
        const probe =
            document.createElement("canvas").getContext("webgl2", glAttrs) ||
            document.createElement("canvas").getContext("webgl", glAttrs);
        if (!probe) {
            setWebglFailed(true);
            return undefined;
        }

        let renderer;
        try {
            renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
        } catch {
            setWebglFailed(true);
            return undefined;
        }
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);

        const scene = new Scene();
        const camera = new PerspectiveCamera(42, width / height, 0.1, 60);
        const BASE_Z = 12.6;
        camera.position.set(0, 0, BASE_Z);

        const group = new Group();
        scene.add(group);

        const dotTexture = makeDotTexture();
        const count = width < 760 ? 260 : 560;
        const { positions, centers } = buildPositions(count);
        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

        /* Màu hạt: phần lớn là "mực nhạt" pha accent, một số đậm accent/violet. */
        const faint = new Color(readToken("--text-faint", "#94a3b8"));
        const accent = new Color(readToken("--accent", "#0284c7"));
        const violet = new Color(readToken("--violet", "#7c3aed"));
        const accentBright = new Color(readToken("--accent-bright", "#0ea5e9"));
        const violetBright = new Color(readToken("--violet-bright", "#8b5cf6"));
        const moteColors = new Float32Array(count * 3);
        const tmp = new Color();
        for (let i = 0; i < count; i += 1) {
            const roll = Math.random();
            if (roll < 0.72) tmp.copy(faint).lerp(accent, 0.2 + Math.random() * 0.3);
            else if (roll < 0.92) tmp.copy(accent).lerp(accentBright, Math.random() * 0.6);
            else tmp.copy(violet).lerp(violetBright, Math.random() * 0.6);
            moteColors[i * 3] = tmp.r;
            moteColors[i * 3 + 1] = tmp.g;
            moteColors[i * 3 + 2] = tmp.b;
        }
        geometry.setAttribute("color", new Float32BufferAttribute(moteColors, 3));

        const pointsMaterial = new PointsMaterial({
            size: 0.14,
            map: dotTexture,
            vertexColors: true,
            transparent: true,
            opacity: dark ? 0.85 : 0.75,
            depthWrite: false,
            sizeAttenuation: true,
            blending: dark ? AdditiveBlending : NormalBlending,
        });
        const points = new Points(geometry, pointsMaterial);
        group.add(points);

        /* Lưới nối */
        const lineGeometry = new BufferGeometry();
        lineGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
        lineGeometry.setIndex(buildLineIndices(positions, count));
        const lineMaterial = new LineBasicMaterial({
            color: accent.clone().lerp(faint, 0.25),
            transparent: true,
            opacity: dark ? 0.13 : 0.1,
            depthWrite: false,
            blending: dark ? AdditiveBlending : NormalBlending,
        });
        const lines = new LineSegments(lineGeometry, lineMaterial);
        group.add(lines);

        /* Hub phát sáng = "câu trả lời" */
        const hubSprites = [];
        centers.forEach((c, i) => {
            const material = new SpriteMaterial({
                map: dotTexture,
                color: i % 2 ? violetBright : accentBright,
                transparent: true,
                opacity: dark ? 0.5 : 0.38,
                depthWrite: false,
                blending: dark ? AdditiveBlending : NormalBlending,
            });
            const sprite = new Sprite(material);
            sprite.position.set(c[0], c[1], c[2]);
            const scale = 0.75 + Math.random() * 0.5;
            sprite.scale.set(scale, scale, 1);
            sprite.userData = { base: dark ? 0.5 : 0.38, phase: Math.random() * Math.PI * 2, scale };
            group.add(sprite);
            hubSprites.push(sprite);
        });

        /* Đổi theme → tô lại màu + kiểu blending */
        const retint = () => {
            const d = isDarkTheme();
            const faintNow = new Color(readToken("--text-faint", "#94a3b8"));
            pointsMaterial.opacity = d ? 0.85 : 0.75;
            pointsMaterial.blending = d ? AdditiveBlending : NormalBlending;
            pointsMaterial.needsUpdate = true;
            lineMaterial.color.set(readToken("--accent", "#0284c7")).lerp(faintNow, 0.25);
            lineMaterial.opacity = d ? 0.13 : 0.1;
            lineMaterial.blending = d ? AdditiveBlending : NormalBlending;
            lineMaterial.needsUpdate = true;
            hubSprites.forEach((sprite, i) => {
                sprite.material.color.set(i % 2 ? readToken("--violet-bright", "#8b5cf6") : readToken("--accent-bright", "#0ea5e9"));
                sprite.material.opacity = d ? 0.5 : 0.38;
                sprite.material.blending = d ? AdditiveBlending : NormalBlending;
                sprite.material.needsUpdate = true;
                sprite.userData.base = d ? 0.5 : 0.38;
            });
            if (reducedMotion) renderer.render(scene, camera);
        };
        const themeObserver = new MutationObserver(retint);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        /* Chuột: nghiêng nhẹ theo con trỏ */
        const pointer = { x: 0, y: 0 };
        const onPointerMove = (event) => {
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
        };

        /* Resize */
        const resize = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            if (reducedMotion) renderer.render(scene, camera);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);

        let rafId = 0;
        let running = true;
        const clock = { last: performance.now() };

        const frame = (now) => {
            const dt = Math.min((now - clock.last) / 1000, 0.05);
            clock.last = now;

            group.rotation.y += dt * 0.05;
            group.rotation.x += (pointer.y * 0.07 - group.rotation.x) * 0.045;
            group.rotation.z += (pointer.x * 0.03 - group.rotation.z) * 0.045;

            /* Cuộn trang: camera lùi nhẹ, trường trôi lên và mờ dần để chữ nổi */
            const p = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.6);
            camera.position.z = BASE_Z + p * 1.7;
            group.position.y = p * 1.1;
            const opacity = Math.max(0.38, 1 - p * 0.4);
            canvas.style.opacity = String(opacity);

            const t = now / 1000;
            hubSprites.forEach((sprite) => {
                const { base, phase, scale } = sprite.userData;
                sprite.material.opacity = base * (0.72 + 0.28 * Math.sin(t * 0.9 + phase));
                const s = scale * (1 + 0.08 * Math.sin(t * 0.7 + phase));
                sprite.scale.set(s, s, 1);
            });

            renderer.render(scene, camera);
            if (running) rafId = requestAnimationFrame(frame);
        };

        const start = () => {
            canvas.style.opacity = "0";
            if (reducedMotion) {
                renderer.render(scene, camera);
                requestAnimationFrame(() => {
                    canvas.style.opacity = "0.7";
                });
                return;
            }
            rafId = requestAnimationFrame((now) => {
                clock.last = now;
                frame(now);
                canvas.style.opacity = "1";
            });
        };

        const onVisibility = () => {
            if (reducedMotion) return;
            if (document.hidden) {
                running = false;
                cancelAnimationFrame(rafId);
            } else if (!running) {
                running = true;
                clock.last = performance.now();
                rafId = requestAnimationFrame(frame);
            }
        };

        start();

        if (!reducedMotion) {
            window.addEventListener("pointermove", onPointerMove, { passive: true });
        }
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            running = false;
            cancelAnimationFrame(rafId);
            themeObserver.disconnect();
            resizeObserver.disconnect();
            window.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("visibilitychange", onVisibility);
            geometry.dispose();
            lineGeometry.dispose();
            pointsMaterial.dispose();
            lineMaterial.dispose();
            hubSprites.forEach((sprite) => sprite.material.dispose());
            dotTexture.dispose();
            renderer.dispose();
            renderer.forceContextLoss?.();
        };
    }, [webglFailed]);

    if (webglFailed) {
        /* Fallback 2D: nhẹ hơn bản vivid, chỉ nhấc lên một chút so mặc định */
        return <TriangleField density={1.2} vivid={1.3} />;
    }

    return <canvas ref={canvasRef} className="knowledge-field" aria-hidden="true" />;
};

export default KnowledgeField;
