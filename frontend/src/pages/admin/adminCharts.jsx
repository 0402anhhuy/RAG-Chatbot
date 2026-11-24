import { useMemo, useRef, useState } from "react";

const nf = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

const W = 720;
const H = 260;
const PAD = { top: 16, right: 12, bottom: 26, left: 12 };

const dayLabel = (iso) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

const niceMax = (v) => {
    if (v <= 5) return 5;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const step = pow / 2;
    return Math.ceil(v / step) * step;
};

/** Biểu đồ vùng 2 chuỗi (mỗi chuỗi tự scale theo max của riêng nó) với crosshair hover. */
export function PulseChart({ series }) {
    const wrapRef = useRef(null);
    const [hover, setHover] = useState(null);

    const geom = useMemo(() => {
        const pts = series || [];
        const n = pts.length;
        if (!n) return null;

        const usersMax = niceMax(Math.max(1, ...pts.map((p) => p.newUsers)));
        const aiMax = niceMax(Math.max(1, ...pts.map((p) => p.aiEvents)));

        const innerW = W - PAD.left - PAD.right;
        const innerH = H - PAD.top - PAD.bottom;
        const x = (i) => PAD.left + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1));
        const y = (v, max) => PAD.top + innerH - (v / max) * innerH;

        const buildPath = (getVal, max) => {
            const line = pts
                .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(getVal(p), max).toFixed(1)}`)
                .join(" ");
            const area = `${line} L${x(n - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`;
            return { line, area };
        };

        const gridLines = [0.25, 0.5, 0.75, 1].map((t) => PAD.top + innerH * (1 - t));
        const tickIdx = n <= 8
            ? pts.map((_, i) => i)
            : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];

        return {
            n,
            x,
            y,
            innerH,
            innerW,
            usersPath: buildPath((p) => p.newUsers, usersMax),
            aiPath: buildPath((p) => p.aiEvents, aiMax),
            usersMax,
            aiMax,
            gridLines,
            tickIdx,
        };
    }, [series]);

    if (!geom) {
        return <div className="pulse-empty">No activity in this period yet.</div>;
    }

    const handleMove = (e) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const ratio = (e.clientX - rect.left) / rect.width;
        const idx = Math.min(geom.n - 1, Math.max(0, Math.round(ratio * (geom.n - 1))));
        setHover(idx);
    };

    const point = hover != null ? series[hover] : null;

    return (
        <div
            className="pulse-wrap"
            ref={wrapRef}
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
            onTouchStart={handleMove}
            onTouchMove={handleMove}
            onTouchEnd={() => setHover(null)}
        >
            <svg
                className="pulse-svg"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Platform activity chart"
            >
                <defs>
                    <linearGradient id="pulse-users" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="pulse-ai" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.26" />
                        <stop offset="100%" stopColor="var(--violet)" stopOpacity="0.02" />
                    </linearGradient>
                </defs>

                {geom.gridLines.map((gy) => (
                    <line
                        key={gy}
                        x1={PAD.left}
                        x2={W - PAD.right}
                        y1={gy}
                        y2={gy}
                        stroke="var(--border-faint)"
                        strokeWidth="1"
                    />
                ))}

                <path d={geom.aiPath.area} fill="url(#pulse-ai)" />
                <path d={geom.aiPath.line} fill="none" stroke="var(--violet)" strokeWidth="1.8" />
                <path d={geom.usersPath.area} fill="url(#pulse-users)" />
                <path d={geom.usersPath.line} fill="none" stroke="var(--accent)" strokeWidth="1.8" />

                {geom.tickIdx.map((i) => (
                    <text
                        key={i}
                        x={geom.x(i)}
                        y={H - 6}
                        textAnchor={i === 0 ? "start" : i === geom.n - 1 ? "end" : "middle"}
                        className="pulse-tick"
                    >
                        {dayLabel(series[i].date)}
                    </text>
                ))}

                {hover != null && (
                    <g>
                        <line
                            x1={geom.x(hover)}
                            x2={geom.x(hover)}
                            y1={PAD.top}
                            y2={PAD.top + geom.innerH}
                            stroke="var(--border-strong)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                        />
                        <circle
                            cx={geom.x(hover)}
                            cy={geom.y(series[hover].newUsers, geom.usersMax)}
                            r="3.5"
                            fill="var(--accent)"
                            stroke="var(--surface-card)"
                            strokeWidth="1.5"
                        />
                        <circle
                            cx={geom.x(hover)}
                            cy={geom.y(series[hover].aiEvents, geom.aiMax)}
                            r="3.5"
                            fill="var(--violet)"
                            stroke="var(--surface-card)"
                            strokeWidth="1.5"
                        />
                    </g>
                )}
            </svg>

            {point && (
                <div
                    className="pulse-tooltip"
                    style={{
                        left: `${(geom.x(hover) / W) * 100}%`,
                    }}
                >
                    <span className="pulse-tooltip-date">{dayLabel(point.date)}</span>
                    <span className="pulse-tooltip-row">
                        <i className="dot dot-accent" /> {nf.format(point.newUsers)} new accounts
                    </span>
                    <span className="pulse-tooltip-row">
                        <i className="dot dot-violet" /> {nf.format(point.aiEvents)} AI events
                    </span>
                </div>
            )}
        </div>
    );
}

/** Vòng tròn tỷ lệ role với tổng ở giữa. */
export function RoleDonut({ distribution }) {
    const admin = Number(distribution?.ADMIN || 0);
    const user = Number(distribution?.USER || 0);
    const total = admin + user;

    if (!total) {
        return <div className="pulse-empty">No members yet.</div>;
    }

    const R = 54;
    const C = 2 * Math.PI * R;
    const adminFrac = admin / total;
    const adminLen = C * adminFrac;

    return (
        <div className="donut-wrap">
            <div className="donut-figure">
                <svg viewBox="0 0 140 140" className="donut-svg" aria-hidden="true">
                    <circle
                        cx="70"
                        cy="70"
                        r={R}
                        fill="none"
                        stroke="var(--accent-soft)"
                        strokeWidth="16"
                    />
                    <circle
                        cx="70"
                        cy="70"
                        r={R}
                        fill="none"
                        stroke="var(--violet)"
                        strokeWidth="16"
                        strokeDasharray={`${adminLen} ${C - adminLen}`}
                        strokeLinecap="butt"
                        transform="rotate(-90 70 70)"
                    />
                </svg>
                <div className="donut-center">
                    <strong>{compact.format(total)}</strong>
                    <span>members</span>
                </div>
            </div>
            <ul className="donut-legend">
                <li>
                    <i className="dot dot-violet" />
                    <span className="legend-label">Admin</span>
                    <span className="legend-value">{nf.format(admin)}</span>
                </li>
                <li>
                    <i className="dot dot-accent" />
                    <span className="legend-label">User</span>
                    <span className="legend-value">{nf.format(user)}</span>
                </li>
            </ul>
        </div>
    );
}
