import { useMemo, useState } from "react";
import { formatCost } from "@/features/developer-hub/projects/analytics/helpers/analyticsFormat.js";
import {
    CHART_VIEW,
    buildAxis,
    buildTicks,
    areaPath,
    linePath,
    pickAxisLabels,
    xAt,
    yAt,
    costTooltipRows,
    lineActivityRows,
} from "@/features/developer-hub/projects/analytics/helpers/analyticsChart.js";

const { left, right, top, bottom } = CHART_VIEW;

const GridLines = ({ ticks, max }) => (
    <g>
        {ticks.map((value) => {
            const y = yAt(value, max);
            return (
                <line
                    key={value}
                    x1={left}
                    y1={y}
                    x2={right}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                />
            );
        })}
    </g>
);

const AxisY = ({ labels }) => (
    <div className="chart-axis-y">
        {labels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
        ))}
    </div>
);

// Nhãn trục X nằm tuyệt đối theo đúng toạ độ điểm tương ứng trên SVG.
const AxisX = ({ items, total }) => (
    <div className="chart-axis-x">
        {items.map((item) => (
            <span
                key={item.index}
                className="chart-axis-x-tick"
                style={{ left: `${(xAt(item.index, total) / CHART_VIEW.width) * 100}%` }}
            >
                {item.label}
            </span>
        ))}
    </div>
);

/* ------------------------------------------------------------- Cost trend */

const CostTrendChart = ({ points, emptyLabel }) => {
    const [activeIndex, setActiveIndex] = useState(null);

    const axis = useMemo(
        () => buildAxis(points.flatMap((point) => [point.project, point.personal, point.total])),
        [points],
    );
    const labels = useMemo(() => pickAxisLabels(points), [points]);
    const active = activeIndex === null ? null : points[activeIndex];

    // Không có ngày nào (tháng chưa có lượt dùng) thì chỉ hiện khung + trục.
    if (!points.length) {
        return <div className="chart-empty-state">{emptyLabel}</div>;
    }

    return (
        <div className="chart-svg-wrapper" onMouseLeave={() => setActiveIndex(null)}>
            <svg className="chart-svg" viewBox="0 0 900 200" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--warning)" stopOpacity="0" />
                    </linearGradient>
                </defs>

                <GridLines ticks={axis.ticks} max={axis.max} />

                <path
                    d={areaPath(
                        points.map((p) => p.total),
                        axis.max,
                    )}
                    fill="url(#costGradient)"
                />

                <path
                    d={linePath(
                        points.map((p) => p.project),
                        axis.max,
                    )}
                    fill="none"
                    stroke="var(--violet-bright)"
                    strokeWidth="2"
                />
                <path
                    d={linePath(
                        points.map((p) => p.total),
                        axis.max,
                    )}
                    fill="none"
                    stroke="var(--warning)"
                    strokeWidth="2.5"
                />

                {active && (
                    <>
                        <line
                            x1={xAt(activeIndex, points.length)}
                            y1={top}
                            x2={xAt(activeIndex, points.length)}
                            y2={bottom}
                            stroke="var(--icon-faint)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                        />
                        <circle
                            cx={xAt(activeIndex, points.length)}
                            cy={yAt(active.total, axis.max)}
                            r="4"
                            fill="var(--warning)"
                        />
                        <circle
                            cx={xAt(activeIndex, points.length)}
                            cy={yAt(active.project, axis.max)}
                            r="4"
                            fill="var(--violet-bright)"
                        />
                    </>
                )}

                {/* Vùng bắt hover: mỗi ngày một dải dọc, rộng bằng khoảng cách giữa 2 điểm. */}
                {points.map((point, index) => {
                    const width =
                        points.length > 1 ? (right - left) / (points.length - 1) : right - left;
                    return (
                        <rect
                            key={point.date}
                            x={xAt(index, points.length) - width / 2}
                            y={top - 10}
                            width={width}
                            height={bottom - top + 20}
                            fill="transparent"
                            onMouseEnter={() => setActiveIndex(index)}
                        />
                    );
                })}
            </svg>

            {active && (
                <div
                    className="chart-floating-tooltip"
                    style={{
                        left: `${(xAt(activeIndex, points.length) / CHART_VIEW.width) * 100}%`,
                        top: 0,
                    }}
                >
                    <div className="tooltip-date-header">{active.label}</div>
                    {costTooltipRows(active).map((row) => (
                        <div className="tooltip-item-row" key={row.label}>
                            <span className={`dot-circle ${row.color}`} />
                            <span>{row.label}</span>
                            <strong>{row.value}</strong>
                        </div>
                    ))}
                </div>
            )}

            <AxisY labels={buildTicks(axis.max, (value) => formatCost(value))} />
            <AxisX items={labels} total={points.length} />
        </div>
    );
};

/* -------------------------------------------------------- Code activity */

const CodeActivityChart = ({ points, emptyLabel }) => {
    const [activeIndex, setActiveIndex] = useState(null);
    const axis = useMemo(
        () =>
            buildAxis(
                points.map((point) => Math.max(point.linesAdded, Math.abs(point.linesRemoved))),
            ),
        [points],
    );
    const labels = useMemo(() => pickAxisLabels(points, 4), [points]);
    const active = activeIndex === null ? null : points[activeIndex];

    if (!points.length) {
        return <div className="chart-empty-state">{emptyLabel}</div>;
    }

    return (
        <div className="chart-svg-wrapper" onMouseLeave={() => setActiveIndex(null)}>
            <svg className="chart-svg" viewBox="0 0 900 200" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="codeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--success-bright)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--success-bright)" stopOpacity="0" />
                    </linearGradient>
                </defs>

                <GridLines ticks={axis.ticks} max={axis.max} />

                <path
                    d={areaPath(
                        points.map((p) => p.linesAdded),
                        axis.max,
                    )}
                    fill="url(#codeGradient)"
                />
                <path
                    d={linePath(
                        points.map((p) => p.linesAdded),
                        axis.max,
                    )}
                    fill="none"
                    stroke="var(--success-bright)"
                    strokeWidth="2.5"
                />
                <path
                    d={linePath(
                        points.map((p) => Math.abs(p.linesRemoved)),
                        axis.max,
                    )}
                    fill="none"
                    stroke="var(--danger)"
                    strokeWidth="2"
                />

                {active && (
                    <circle
                        cx={xAt(activeIndex, points.length)}
                        cy={yAt(active.linesAdded, axis.max)}
                        r="4"
                        fill="var(--success-bright)"
                    />
                )}

                {points.map((point, index) => {
                    const width =
                        points.length > 1 ? (right - left) / (points.length - 1) : right - left;
                    return (
                        <rect
                            key={point.date}
                            x={xAt(index, points.length) - width / 2}
                            y={top - 10}
                            width={width}
                            height={bottom - top + 20}
                            fill="transparent"
                            onMouseEnter={() => setActiveIndex(index)}
                        />
                    );
                })}
            </svg>

            {active && (
                <div
                    className="chart-floating-tooltip"
                    style={{
                        left: `${(xAt(activeIndex, points.length) / CHART_VIEW.width) * 100}%`,
                        top: 0,
                    }}
                >
                    <div className="tooltip-date-header">{active.label}</div>
                    {lineActivityRows(active).map((row) => (
                        <div className="tooltip-item-row" key={row.label}>
                            <span className={`dot-circle ${row.color}`} />
                            <span>{row.label}</span>
                            <strong>{row.value}</strong>
                        </div>
                    ))}
                </div>
            )}

            <AxisY labels={buildTicks(axis.max, (value) => String(Math.round(value)))} />
            <AxisX items={labels} total={points.length} />
        </div>
    );
};

export { CostTrendChart, CodeActivityChart };
