import { FileText, ShieldCheck, CheckCircle2 } from "lucide-react";

/**
 * Các "ảnh showcase" của landing page — vẽ hoàn toàn bằng CSS/SVG với
 * var(--token) nên tự đổi màu theo theme (không dùng ảnh raster).
 */

export const MockChatPanel = () => (
    <div className="mock-panel mock-chat" aria-hidden="true">
        <div className="mock-chrome">
            <i /><i /><i />
            <span className="mock-chrome-title">Prism Assistant</span>
        </div>
        <div className="mock-chat-body">
            <div className="mock-bubble-user">What changed in the auth flow since v2.3?</div>
            <div className="mock-answer">
                <span className="mock-answer-glow" />
                Token refresh moved to rotating refresh tokens; the legacy
                <code>/sessions</code> endpoint is deprecated in favor of
                <code>/auth/rotate</code>.
            </div>
            <div className="mock-source-row">
                <span className="mock-source-chip"><FileText size={10} /> auth.md</span>
                <span className="mock-source-chip"><FileText size={10} /> RFC-013</span>
                <span className="mock-source-chip"><FileText size={10} /> api.yaml</span>
                <span className="mock-confidence">
                    <ShieldCheck size={10} /> 3 sources
                </span>
            </div>
        </div>
    </div>
);

const DIFF_MINUS = [
    "- if (token.expired()) {",
    "-     reject(new AuthError());",
];
const DIFF_PLUS = [
    "+ if (refreshService.isStale(token)) {",
    "+     rotate(token, { window: 30_000 });",
];

export const MockDiffPanel = () => (
    <div className="mock-panel mock-diff" aria-hidden="true">
        <div className="mock-chrome">
            <i /><i /><i />
            <span className="mock-chrome-title">AuthService.java · review</span>
            <span className="mock-findings-badge">2 findings</span>
        </div>
        <pre className="mock-code">
            {DIFF_MINUS.map((l) => (
                <span key={l} className="line line-minus">{l}</span>
            ))}
            {DIFF_PLUS.map((l) => (
                <span key={l} className="line line-plus">{l}</span>
            ))}
        </pre>
        <ul className="mock-findings">
            <li>
                <i className="dot dot-crit" />
                Rotation window bypasses clock-skew guard
            </li>
            <li>
                <i className="dot dot-warn" />
                Missing test for expired-token path
            </li>
        </ul>
    </div>
);

export const MockQuizPanel = () => (
    <div className="mock-panel mock-quiz" aria-hidden="true">
        <div className="mock-quiz-head">
            <span className="mock-quiz-eyebrow">FLASHCARD · NETWORK SECURITY</span>
            <span className="mock-quiz-progress">
                <i className="on" /><i className="on" /><i /><i /><i />
            </span>
        </div>
        <p className="mock-quiz-question">Which OAuth 2.0 flow prevents authorization-code interception?</p>
        <div className="mock-quiz-answer">
            <CheckCircle2 size={13} /> Authorization Code + PKCE
        </div>
        <span className="mock-quiz-hint">Tap to flip</span>
    </div>
);

export const MockCanvasPanel = () => {
    const nodes = [
        { id: "client", label: "Client", x: 14, y: 52 },
        { id: "api", label: "API Gateway", x: 150, y: 14 },
        { id: "auth", label: "Auth", x: 150, y: 96 },
        { id: "db", label: "Postgres", x: 292, y: 52 },
    ];
    const edges = [
        ["client", "api"],
        ["client", "auth"],
        ["api", "db"],
        ["auth", "db"],
    ];
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

    return (
        <div className="mock-panel mock-canvas" aria-hidden="true">
            <div className="mock-canvas-head">
                <span className="mock-quiz-eyebrow">ARCHITECTURE CANVAS</span>
                <span className="mock-canvas-meta">4 nodes · 4 edges</span>
            </div>
            <svg viewBox="0 0 380 130" className="mock-canvas-svg">
                {edges.map(([a, b]) => {
                    const A = byId[a];
                    const B = byId[b];
                    return (
                        <line
                            key={`${a}-${b}`}
                            x1={A.x + 62}
                            y1={A.y + 11}
                            x2={B.x - 4}
                            y2={B.y + 11}
                            stroke="var(--border-strong)"
                            strokeWidth="1.2"
                        />
                    );
                })}
                {nodes.map((n) => (
                    <g key={n.id}>
                        <rect
                            x={n.x}
                            y={n.y}
                            width="66"
                            height="22"
                            rx="7"
                            className={n.id === "auth" ? "node node-hot" : "node"}
                        />
                        <text x={n.x + 33} y={n.y + 14.5} textAnchor="middle" className="node-label">
                            {n.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};
