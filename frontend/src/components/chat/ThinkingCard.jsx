import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import "./ThinkingCard.css";

const numberFormat = new Intl.NumberFormat("en-US");

const formatDuration = (seconds) => {
    if (seconds == null || Number.isNaN(seconds)) return null;
    if (seconds < 1) return "<1s";
    if (seconds < 10) return `${seconds.toFixed(1).replace(/\.0$/, "")}s`;
    return `${Math.round(seconds)}s`;
};

/**
 * Thẻ "Thinking" kiểu VibeFlow: gọn khi xong, mở khi đang suy luận.
 *
 * - Đang chạy: tự mở, hiện số ký tự tăng dần.
 * - Xong: tự thu gọn còn 3 dòng + fade, kèm "Thought for Xs, N chars".
 * - Người dùng bấm header hoặc "Show more/less" để mở/đóng thủ công.
 * - Không có timestamp thì chỉ hiện số ký tự, không bịa thời gian.
 */
const ThinkingCard = ({
    text = "",
    status = "success",
    startedAt = null,
    endedAt = null,
    className = "",
}) => {
    const running = status === "running";
    const [manualOpen, setManualOpen] = useState(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!running) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 500);
        return () => window.clearInterval(timer);
    }, [running]);

    const open = manualOpen === null ? running : manualOpen;
    const charCount = text.length;
    const canCollapse = charCount > 180;
    const showToggle = canCollapse || open;

    const duration = useMemo(() => {
        const start = Number(startedAt) || null;
        const end = running ? now : Number(endedAt) || null;
        if (!start || !end || end < start) return null;
        return (end - start) / 1000;
    }, [endedAt, now, running, startedAt]);

    const meta = useMemo(() => {
        const chars = `${numberFormat.format(charCount)} chars`;
        if (running) return chars;
        const durationLabel = formatDuration(duration);
        return durationLabel ? `Thought for ${durationLabel}, ${chars}` : chars;
    }, [charCount, duration, running]);

    if (!text && !running) return null;

    return (
        <section
            className={`thinking-card ${running ? "is-running" : ""} ${className}`.trim()}
            data-status={status}
        >
            <button
                type="button"
                className="thinking-card-head"
                onClick={() => setManualOpen(!open)}
                aria-expanded={open}
            >
                <span className="thinking-card-glyph" aria-hidden="true">
                    <Sparkles size={11} />
                </span>
                <span className="thinking-card-title">Thinking</span>
                {running && <span className="thinking-card-live" aria-hidden="true" />}
                <span className="thinking-card-meta">{meta}</span>
                <span className="thinking-card-chevron" aria-hidden="true">
                    {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
            </button>

            <div className={`thinking-card-body ${open ? "is-open" : ""}`}>
                <p>
                    {text}
                    {running && <span className="thinking-card-caret" aria-hidden="true" />}
                </p>
            </div>

            {showToggle && (
                <button
                    type="button"
                    className="thinking-card-more"
                    onClick={() => setManualOpen(!open)}
                >
                    {open ? "Show less" : "Show more"}
                    {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
            )}
        </section>
    );
};

export default ThinkingCard;
