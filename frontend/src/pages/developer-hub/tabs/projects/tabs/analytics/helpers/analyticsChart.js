import { formatCost } from "./analyticsFormat";

// Hình học biểu đồ: vùng vẽ cách mép trái đúng bằng trục Y (40px) và mép phải 20px
// để đường và nhãn trục thẳng hàng trên mọi kích thước khung.
export const CHART_VIEW = { width: 900, height: 200, left: 40, right: 880, top: 30, bottom: 165 };

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Chia trục Y "đẹp": trả về max của trục cùng các mốc chia đều 4 khoảng.
 * Toàn bộ series bằng 0 thì vẫn vẽ được khung với max = 1.
 */
export const buildAxis = (values) => {
    const safeValues = values.filter((value) => Number.isFinite(value));
    const rawMax = safeValues.length ? Math.max(...safeValues) : 0;
    const max = rawMax > 0 ? round2(rawMax * 1.15) : 1;
    const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
    return { max, ticks };
};

export const buildTicks = (max, formatter) =>
    [max, max * 0.75, max * 0.5, max * 0.25, 0].map((value) => formatter(value));

/** Toạ độ X của điểm thứ index trong series có length điểm. */
export const xAt = (index, length) => {
    if (length <= 1) return (CHART_VIEW.left + CHART_VIEW.right) / 2;
    const span = CHART_VIEW.right - CHART_VIEW.left;
    return CHART_VIEW.left + (span * index) / (length - 1);
};

/** Toạ độ Y theo giá trị, dùng chung cho mọi series của cùng một biểu đồ. */
export const yAt = (value, max) => {
    const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
    return CHART_VIEW.bottom - ratio * (CHART_VIEW.bottom - CHART_VIEW.top);
};

/**
 * Dựng "M x,y L x,y ..." từ mảng giá trị. Không vẽ đường khi chưa có điểm nào.
 */
export const linePath = (values, max) => {
    if (!values.length) return "";
    return values
        .map(
            (value, index) =>
                `${index === 0 ? "M" : "L"} ${xAt(index, values.length).toFixed(2)},${yAt(value, max).toFixed(2)}`,
        )
        .join(" ");
};



/** Đường khép kín xuống đáy để tô gradient dưới đồ thị. */
export const areaPath = (values, max) => {
    if (!values.length) return "";
    const line = linePath(values, max);
    const first = xAt(0, values.length).toFixed(2);
    const last = xAt(values.length - 1, values.length).toFixed(2);
    return `${line} L ${last},${CHART_VIEW.bottom} L ${first},${CHART_VIEW.bottom} Z`;
};

/**
 * Nhãn trục X: luôn hiện ngày đầu và cuối (nếu đủ rộng), sau đó chia đều.
 * monthDays là toàn bộ ngày của tháng, nên ngày không có chi phí vẫn có nhãn.
 */
export const pickAxisLabels = (items, limit = 6) => {
    if (items.length <= limit) {
        return items.map((item, index) => ({ ...item, index }));
    }
    const picked = new Set();
    const step = (items.length - 1) / (limit - 1);
    for (let slot = 0; slot < limit; slot += 1) {
        picked.add(Math.round(slot * step));
    }
    return [...picked].sort((a, b) => a - b).map((index) => ({ ...items[index], index }));
};

/** Tooltip của biểu đồ chi phí theo ngày. */
export const costTooltipRows = (point) => [
    { label: "Project", value: formatCost(point.project), color: "amber" },
    { label: "Personal", value: formatCost(point.personal), color: "purple" },
    { label: "Total", value: formatCost(point.total), color: "blue" },
];

export const lineActivityRows = (point) => [
    { label: "Lines added", value: `+${point.linesAdded || 0}`, color: "green" },
    { label: "Lines removed", value: `-${Math.abs(point.linesRemoved || 0)}`, color: "rose" },
];
