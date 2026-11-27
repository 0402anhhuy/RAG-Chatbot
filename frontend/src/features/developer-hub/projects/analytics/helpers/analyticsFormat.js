// Định dạng số liệu hiển thị trên tab Analytics. Không có số liệu thì hiện "—"
// thay vì bịa ra 0, để người dùng biết đây là dữ liệu thật từ BE.

export const EMPTY = "—";

export const formatCost = (value, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return EMPTY;
    const amount = Number(value);
    if (amount === 0) return "$0.00";
    if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`;
    return `$${amount.toFixed(digits)}`;
};

const UNITS = [
    { limit: 1_000_000_000, suffix: "B" },
    { limit: 1_000_000, suffix: "M" },
    { limit: 1_000, suffix: "K" },
];

export const formatTokens = (value) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return EMPTY;
    const unit = UNITS.find((item) => Math.abs(amount) >= item.limit);
    if (!unit) return String(Math.round(amount));
    const scaled = amount / unit.limit;
    return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)}${unit.suffix}`;
};

export const formatCount = (value) => {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? String(Math.round(amount)) : "0";
};

export const formatSigned = (value) => {
    const amount = Number(value || 0);
    if (amount > 0) return `+${amount}`;
    return String(amount);
};

export const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

export const formatInOut = (tokensIn, tokensOut) =>
    `${formatTokens(tokensIn)} / ${formatTokens(tokensOut)}`;

export const formatCache = (read, write) => `${formatTokens(read)} / ${formatTokens(write)}`;

export const initialsOf = (name, email) => {
    const source = (name || email || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    const initials =
        parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : source.slice(0, 2);
    return initials.toUpperCase();
};

// "2026-10" -> "October 2026" và danh sách tháng liền trước để đổ vào CustomSelector.
export const monthOptions = (count = 12, base = new Date()) => {
    const options = [];
    for (let index = 0; index < count; index += 1) {
        const date = new Date(base.getFullYear(), base.getMonth() - index, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        options.push({ value, label });
    }
    return options;
};

export const currentMonthValue = () => monthOptions(1)[0].value;
