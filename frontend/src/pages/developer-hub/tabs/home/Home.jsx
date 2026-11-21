import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BookOpen,
    CheckCircle,
    Clock,
    GraduationCap,
    Loader2,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { academyHomeApi } from "../../../../api";
import CustomSelector from "../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../context/ToastContext";
import "./Home.css";

// Cửa sổ thời gian cho KPI "Quizzes Solved" và "Study Time"
const RANGE_OPTIONS = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "all", label: "Full term" },
];

const KPI_ICONS = {
    active_courses: BookOpen,
    average_mastery: CheckCircle,
    quizzes_solved: Sparkles,
    study_time: Clock,
};

const KPI_COLORS = {
    average_mastery: "#059669",
};

const getSessionUser = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem("rag_session") || "{}");
        return parsed?.user || parsed || {};
    } catch {
        return {};
    }
};

const Home = ({ onNavigateTab, onLaunchTool, workspaceId }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [range, setRange] = useState("30d");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadHome = useCallback(
        async (signal) => {
            if (!sessionUser?.id) {
                setData(null);
                return;
            }
            try {
                setLoading(true);
                const result = await academyHomeApi.get({
                    ownerId: sessionUser.id,
                    workspaceId: workspaceId || undefined,
                    range,
                });
                if (signal?.cancelled) return;
                setData(result);
            } catch (err) {
                if (signal?.cancelled) return;
                setData(null);
                showToast(err.message || "Unable to load your dashboard.", "error");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [sessionUser?.id, workspaceId, range, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadHome(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadHome]);

    const handleRangeChange = (value, option) => {
        setRange(value);
        showToast(`Showing ${option?.label?.toLowerCase() || value} of study activity.`, "info");
    };

    const handleRefresh = () => {
        loadHome();
        showToast("Dashboard refreshed.", "info");
    };

    const kpis = useMemo(() => data?.kpis || [], [data]);
    const continueLearning = data?.continueLearning;
    const courses = data?.courses || [];
    const recommendations = data?.recommendations || [];

    // Lọc sạch khoảng trắng thừa
    const code = continueLearning?.courseCode?.trim() || "";
    const title = continueLearning?.courseTitle?.trim() || "";
    const step = continueLearning?.step?.trim() || "";
    const nextLesson = continueLearning?.nextLesson?.trim() || "";

    // Chỉ coi là hợp lệ khi có ít nhất code hoặc title thực sự có chữ
    const hasValidCourse = Boolean(code || title);

    // Xây dựng chuỗi tiêu đề an toàn: nếu có cả code & title thì mới nối bằng ": "
    const displayTitle = code && title ? `${code}: ${title}` : code || title;

    return (
        <div className="edu-home-bounds">
            {/* Hero Study Banner */}
            <div className="edu-resume-hero">
                <div className="resume-hero-left">
                    <div className="resume-icon-badge">
                        <GraduationCap size={22} />
                    </div>
                    <div className="resume-copy">
                        <span className="resume-eyebrow">CONTINUE LEARNING</span>
                        {loading && !data ? (
                            <p>Loading your study plan…</p>
                        ) : hasValidCourse ? (
                            <>
                                <h3>
                                    {displayTitle}
                                    {step ? ` — ${step}` : ""}
                                </h3>
                                <p>{nextLesson || "Ready to resume"}</p>
                            </>
                        ) : (
                            <>
                                <h3>No course in progress</h3>
                                <p>Join a course to start a guided study plan.</p>
                            </>
                        )}
                    </div>
                </div>

                <div className="resume-hero-actions">
                    <div className="time-range-toggles">
                        <CustomSelector
                            options={RANGE_OPTIONS}
                            value={range}
                            onChange={handleRangeChange}
                            placeholder="Range"
                        />
                        <button
                            type="button"
                            className="btn-reload-icon"
                            onClick={handleRefresh}
                            disabled={loading}
                            title="Reload dashboard"
                        >
                            {loading ? (
                                <Loader2 size={13} className="ws-spinner" />
                            ) : (
                                <RefreshCw size={13} />
                            )}
                        </button>
                    </div>

                    {hasValidCourse ? (
                        <button
                            type="button"
                            className="btn-continue-edu"
                            onClick={() => onLaunchTool?.("tutor")}
                        >
                            <span>Resume with Tutor</span>
                            <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn-continue-edu"
                            onClick={() => onNavigateTab?.("courses")}
                        >
                            <span>Join a course</span>
                            <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="edu-kpi-grid">
                {kpis.map((kpi) => {
                    const Icon = KPI_ICONS[kpi.id] || BookOpen;
                    return (
                        <div key={kpi.id} className="edu-kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">{kpi.label}</span>
                                <Icon size={14} className="kpi-icon-muted" />
                            </div>
                            <div
                                className="kpi-value"
                                style={KPI_COLORS[kpi.id] ? { color: KPI_COLORS[kpi.id] } : {}}
                            >
                                {kpi.value}
                            </div>
                            <span className="kpi-sub-note">{kpi.note}</span>
                        </div>
                    );
                })}
                {!loading && kpis.length === 0 && (
                    <div className="edu-kpi-card">
                        <span className="kpi-label">No study data yet</span>
                        <span className="kpi-sub-note">
                            Upload course material or take a quiz to see your metrics.
                        </span>
                    </div>
                )}
            </div>

            {/* Enrolled Courses & Quick Flashcard Grid */}
            <div className="edu-split-sections">
                <div className="courses-progress-card">
                    <div className="section-title-row">
                        <strong>Current Syllabus Progress</strong>
                        <button
                            type="button"
                            className="btn-text-link"
                            onClick={() => onNavigateTab?.("courses")}
                        >
                            All courses →
                        </button>
                    </div>

                    <div className="course-progress-list">
                        {courses.map((c) => (
                            <div key={c.courseId} className="course-progress-item">
                                <div className="course-meta-head">
                                    <div className="course-title-unit">
                                        <code>{c.code}</code>
                                        <strong>{c.title}</strong>
                                    </div>
                                    <span className="progress-percent">{c.progress}%</span>
                                </div>
                                <div className="progress-bar-track">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${c.progress}%` }}
                                    />
                                </div>
                                <div className="course-next-row">
                                    <small>
                                        {c.nextLesson
                                            ? `Next: ${c.nextLesson}`
                                            : "All lessons completed"}
                                    </small>
                                </div>
                            </div>
                        ))}
                        {!loading && courses.length === 0 && (
                            <p className="section-empty-feedback">
                                No enrolled courses yet. Use “All courses →” to join your first one.
                            </p>
                        )}
                    </div>
                </div>

                {/* AI Study Assistant Recommendations */}
                <div className="ai-recs-card">
                    <div className="section-title-row">
                        <strong>Instant AI Drill & Mock Exam</strong>
                    </div>
                    <p className="ai-rec-intro">
                        Generated from your submitted attempts and the tools you have already run.
                    </p>
                    <div className="drill-action-boxes">
                        {recommendations.map((rec) => (
                            <div
                                key={rec.id}
                                className="drill-box"
                                onClick={() => onLaunchTool?.(rec.toolId)}
                            >
                                {rec.toolId === "grader" ? (
                                    <CheckCircle size={16} color="#059669" />
                                ) : (
                                    <Sparkles size={16} color="#f59e0b" />
                                )}
                                <div>
                                    <strong>{rec.title}</strong>
                                    <small>{rec.detail}</small>
                                </div>
                            </div>
                        ))}
                        {!loading && recommendations.length === 0 && (
                            <p className="section-empty-feedback">
                                Nothing to practice right now — every graded course is above the
                                advanced threshold.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;