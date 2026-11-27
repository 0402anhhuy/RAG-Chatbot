import { MockCanvasPanel, MockChatPanel } from "@/features/landing/mockPanels.jsx";
import "@/features/landing/HeroCircuit.css";

const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const NODES = [
    { x: 62, y: 74, r: 5 },
    { x: 152, y: 42, r: 4 },
    { x: 232, y: 92, r: 6, hot: "accent" },
    { x: 92, y: 164, r: 4 },
    { x: 182, y: 152, r: 5, hot: "violet" },
    { x: 302, y: 62, r: 4 },
    { x: 332, y: 152, r: 5 },
    { x: 262, y: 212, r: 4 },
    { x: 132, y: 242, r: 6, hot: "accent" },
    { x: 352, y: 252, r: 4 },
];

const LINKS = [
    [0, 1], [1, 2], [0, 3], [3, 4], [2, 4], [2, 5], [5, 6], [4, 6],
    [4, 7], [7, 8], [3, 8], [6, 9], [7, 9], [2, 6],
];

const BEAM_PATHS = [
    "M 62 74 L 152 42 L 232 92 L 302 62 L 332 152 L 262 212 L 132 242",
    "M 92 164 L 182 152 L 332 152 L 352 252",
];

/**
 * HeroCircuit — đúng 3 khối xếp layer bên phải hero (đứng độc lập bằng CSS,
 * không cần GSAP nên luôn hiển thị), knowledge.graph lớn nhất:
 *   lớp dưới:  knowledge.graph — beam bên trong khối
 *   lớp giữa:  canvas (diagram nối) — đè lên graph
 *   lớp trên:  chat (Prism Assistant) — đè lên graph
 * Nền chỉ quầng radial — KHÔNG có graph/beam.
 */
const HeroCircuit = () => (
    <div className="hero-circuit" aria-hidden="true">
        <span className="circuit-glow circuit-glow-a" />
        <span className="circuit-glow circuit-glow-b" />

        {/* Khối 1 — chat */}
        <div className="circuit-block circuit-chat">
            <MockChatPanel />
        </div>

        {/* Khối 2 — knowledge.graph: beam nằm bên trong khối này */}
        <div className="circuit-panel circuit-graph">
            <div className="circuit-chrome">
                <i /><i /><i />
                <span className="circuit-chrome-title">knowledge.graph</span>
                <span className="circuit-badge">12 nodes</span>
            </div>
            <svg viewBox="0 0 420 320" className="circuit-svg">
                <defs>
                    <radialGradient id="circuit-node-glow">
                        <stop offset="0%" stopColor="var(--accent-bright)" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="var(--accent-bright)" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="circuit-node-glow-violet">
                        <stop offset="0%" stopColor="var(--violet-bright)" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="var(--violet-bright)" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {LINKS.map(([a, b]) => (
                    <line
                        key={`${a}-${b}`}
                        className="circuit-link"
                        x1={NODES[a].x}
                        y1={NODES[a].y}
                        x2={NODES[b].x}
                        y2={NODES[b].y}
                    />
                ))}

                {BEAM_PATHS.map((d, i) => (
                    <g key={d}>
                        <path className="circuit-beam-track" d={d} />
                        <circle className={`circuit-beam beam-${i + 1}`} r="3.2">
                            {!reducedMotion() && (
                                <animateMotion
                                    dur={`${6.5 + i * 1.8}s`}
                                    repeatCount="indefinite"
                                    path={d}
                                    begin={`${i * 1.2}s`}
                                />
                            )}
                        </circle>
                    </g>
                ))}

                {NODES.map((n, i) => (
                    <g key={`${n.x}-${n.y}`} className={`circuit-node ${n.hot ? `hot-${n.hot}` : ""}`} style={{ animationDelay: `${(i % 5) * 0.55}s` }}>
                        {n.hot && (
                            <circle
                                cx={n.x}
                                cy={n.y}
                                r={n.r * 4}
                                fill={`url(#circuit-node-glow${n.hot === "violet" ? "-violet" : ""})`}
                            />
                        )}
                        <circle cx={n.x} cy={n.y} r={n.r} className="circuit-node-dot" />
                        <circle cx={n.x} cy={n.y} r={n.r + 3.5} className="circuit-node-ring" />
                    </g>
                ))}
            </svg>
        </div>

        {/* Lớp giữa — canvas diagram nối, đè lên graph */}
        <div className="circuit-block circuit-diagram">
            <MockCanvasPanel />
        </div>
    </div>
);

export default HeroCircuit;
