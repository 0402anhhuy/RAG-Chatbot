import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    GraduationCap,
    RotateCcw,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Loader2,
} from "lucide-react";
import { learningAnalyticsApi } from "../../../../api";
import { useToast } from "../../../../context/ToastContext";
import "./Analytics.css";
import { getSessionUser } from "../../../../components/common/utils/session";

const RANGE_OPTIONS = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "all", label: "Full Term" },
];

const pct = (value) => (value === null || value === undefined ? "—" : `${value}%`);
const hours = (value) => (value === null || value === undefined ? "—" : `${value}h`);
const signed = (value) => {
    if (value === null || value === undefined) return null;
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? "+" : ""}${rounded}%`;
};

const Analytics = ({ onLaunchTool }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [timeRange, setTimeRange] = useState("30d");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadAnalytics = useCallback(
        async (signal) => {
            if (!sessionUser?.id) {
                setData(null);
                return;
            }
            try {
                setLoading(true);
                const result = await learningAnalyticsApi.get({
                    ownerId: sessionUser.id,
                    userId: sessionUser.id,
                    range: timeRange,
                });
                if (signal?.cancelled) return;
                setData(result);
            } catch (err) {
                if (signal?.cancelled) return;
                setData(null);
                showToast(err.message || "Unable to load learning analytics.", "error");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [sessionUser?.id, timeRange, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadAnalytics(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadAnalytics]);

    const summary = data?.summary;
    const skills = data?.skills || [];
    const recentScores = data?.recentScores || [];
    const gaps = data?.knowledgeGaps || [];

    const handleRangeChange = (value, option) => {
        setTimeRange(value);
        showToast(`Showing ${option?.label || value} of learning history.`, "info");
    };

    const handleRefresh = () => {
        loadAnalytics();
        showToast("Analytics refreshed.", "info");
    };

    const masteryDelta = signed(summary?.deltaMastery);
    const tutoringDelta =
        summary?.deltaTutoringHours === null || summary?.deltaTutoringHours === undefined
            ? null
            : `${summary.deltaTutoringHours > 0 ? "+" : ""}${summary.deltaTutoringHours}h compared to the previous period`;

    return (
        <div className="analytics-tab-bounds">
            {/* Header Banner */}
            <div className="analytics-header-banner">
                <div className="banner-lead">
                    <h2>Mastery Index & Learning Analytics</h2>
                    <span>
                        Quantify learning velocity, skill competency matrices, and automated AI
                        knowledge gap remediation
                    </span>
                </div>
                <div className="time-range-toggles">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`toggle-btn ${timeRange === option.value ? "active" : ""}`}
                            onClick={() => handleRangeChange(option.value, option)}
                        >
                            {option.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="btn-link-action"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Reload analytics"
                    >
                        {loading ? <Loader2 size={13} /> : <RotateCcw size={13} />}
                    </button>
                </div>
            </div>

            {/* Top Score Matrix */}
            <div className="analytics-kpi-grid">
                <div className="kpi-score-card">
                    <div className="kpi-top">
                        <span className="kpi-label">Overall Mastery Score</span>
                        <Target size={14} className="kpi-icon-green" />
                    </div>
                    <div className="kpi-big-num green">{pct(summary?.overallMastery)}</div>
                    <span className="kpi-footnote">
                        {masteryDelta ? (
                            <>
                                {summary.deltaMastery >= 0 ? (
                                    <TrendingUp size={12} />
                                ) : (
                                    <TrendingDown size={12} />
                                )}
                                {masteryDelta} vs the earlier half of this period
                            </>
                        ) : (
                            "Not enough attempts to show a trend"
                        )}
                    </span>
                </div>

                <div className="kpi-score-card">
                    <div className="kpi-top">
                        <span className="kpi-label">Socratic Tutoring Hours</span>
                        <Clock size={14} className="kpi-icon-blue" />
                    </div>
                    <div className="kpi-big-num">{hours(summary?.tutoringHours)}</div>
                    <span className="kpi-footnote">
                        {tutoringDelta || "No tutoring activity in this period"}
                    </span>
                </div>

                <div className="kpi-score-card">
                    <div className="kpi-top">
                        <span className="kpi-label">Assessment Accuracy</span>
                        <CheckCircle2 size={14} className="kpi-icon-purple" />
                    </div>
                    <div className="kpi-big-num">{pct(summary?.assessmentAccuracy)}</div>
                    <span className="kpi-footnote">
                        Across {summary?.evaluatedQuestions ?? 0} evaluated questions
                    </span>
                </div>

                <div className="kpi-score-card">
                    <div className="kpi-top">
                        <span className="kpi-label">Identified Knowledge Gaps</span>
                        <AlertTriangle size={14} className="kpi-icon-amber" />
                    </div>
                    <div className="kpi-big-num amber">
                        {summary ? `${summary.gapCount} Topics` : "—"}
                    </div>
                    <span className="kpi-footnote">
                        {summary ? `${summary.highPriorityGaps} high-priority concepts` : "—"}
                    </span>
                </div>
            </div>

            {/* Middle Section: Competency Mastery Breakdown vs Recent Scores */}
            <div className="analytics-middle-grid">
                {/* Left Column: Skill Matrix */}
                <div className="analytics-card-surface">
                    <div className="card-head-title">
                        <strong>Technical Competency Breakdown</strong>
                        <span className="badge-indexed">
                            {data?.rangeLabel || "Syllabus-Aligned"}
                        </span>
                    </div>

                    <div className="skills-meter-list">
                        {skills.length === 0 ? (
                            <p>
                                No graded assessments in this period, so competency cannot be
                                measured yet.
                            </p>
                        ) : (
                            skills.map((item) => (
                                <div key={item.courseCode} className="skill-meter-row">
                                    <div className="meter-label-row">
                                        <div className="skill-name-col">
                                            <code className="course-code-tag">
                                                {item.courseCode}
                                            </code>
                                            <strong>{item.skill}</strong>
                                        </div>
                                        <div className="meter-val-col">
                                            <span
                                                className={`status-text ${
                                                    item.status === "Needs Practice" ? "warn" : ""
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                            <strong>{item.mastery}%</strong>
                                        </div>
                                    </div>
                                    <div className="meter-bar-track">
                                        <div
                                            className="meter-bar-fill"
                                            style={{
                                                width: `${item.mastery}%`,
                                                backgroundColor: item.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Score Progression Ledger */}
                <div className="analytics-card-surface">
                    <div className="card-head-title">
                        <strong>Recent Assessment Scores</strong>
                        <button
                            type="button"
                            className="btn-link-action"
                            onClick={() => onLaunchTool && onLaunchTool("exam_prep")}
                        >
                            View all drills →
                        </button>
                    </div>

                    <div className="recent-scores-table">
                        {recentScores.length === 0 ? (
                            <p>No submitted assessments in this period.</p>
                        ) : (
                            recentScores.map((item) => {
                                const delta = signed(item.delta);
                                return (
                                    <div key={item.attemptId} className="score-row-item">
                                        <div className="score-main-info">
                                            <strong>{item.exam}</strong>
                                            <span className="score-date-text">{item.date}</span>
                                        </div>
                                        <div className="score-result-col">
                                            <span className="score-number-pill">
                                                {item.score}/100
                                            </span>
                                            {delta && (
                                                <span
                                                    className={`score-delta ${
                                                        (item.delta || 0) >= 0 ? "pos" : "neg"
                                                    }`}
                                                >
                                                    {delta}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: AI Knowledge Gap Detection Engine */}
            <div className="knowledge-gaps-container">
                <div className="gaps-header-bar">
                    <div className="gaps-lead-info">
                        <div className="sparkle-badge">
                            <Sparkles size={16} />
                        </div>
                        <div>
                            <strong>Knowledge Gap Detection Engine</strong>
                            <p>
                                Synthesizes incorrect answers and lab rubrics against syllabus
                                specifications to prescribe targeted remedial sessions.
                            </p>
                        </div>
                    </div>
                    <div className="time-range-toggles">
                        <button
                            type="button"
                            className="btn-fix-all"
                            disabled={gaps.length === 0}
                            onClick={() => onLaunchTool && onLaunchTool("tutor")}
                        >
                            <span>Launch Remediation Track</span>
                            <ArrowUpRight size={14} />
                        </button>
                    </div>
                </div>

                <div className="gaps-cards-grid">
                    {gaps.length === 0 ? (
                        <p>
                            No knowledge gaps detected — every graded course is at or above the
                            advanced threshold.
                        </p>
                    ) : (
                        gaps.map((gap) => (
                            <div key={`${gap.courseCode}-${gap.topic}`} className="gap-action-card">
                                <div className="gap-card-topbar">
                                    <span className="gap-course-badge">
                                        {gap.courseCode || "—"}
                                    </span>
                                    <span
                                        className={`gap-priority-pill ${(gap.impact || "").toLowerCase()}`}
                                    >
                                        Priority: {gap.impact}
                                    </span>
                                </div>

                                <strong className="gap-topic-title">{gap.topic}</strong>
                                <p className="gap-reason-desc">{gap.reason}</p>

                                <div className="gap-card-footer">
                                    <button
                                        type="button"
                                        className="btn-remediate-now"
                                        onClick={() =>
                                            onLaunchTool && onLaunchTool(gap.suggestedTool)
                                        }
                                    >
                                        <GraduationCap size={13} />
                                        <span>
                                            {gap.suggestedTool === "exam_prep"
                                                ? "Practice with Exam Prep"
                                                : "Remediate with Socratic Tutor"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
