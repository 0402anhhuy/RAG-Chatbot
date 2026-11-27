import { useMemo, useState } from "react";
import {
    ArrowRight,
    BookOpen,
    CheckCircle,
    Clock,
    Compass,
    GraduationCap,
    Loader2,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { academyHomeApi } from "@/api";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import "@/features/academy-hub/home/EduHome.css";
import { getSessionUser } from "@/lib/session";

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
    average_mastery: "var(--success)",
};

const EduHome = ({ onNavigateTab, onLaunchTool, workspaceId }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [range, setRange] = useState("30d");

    const { data, loading, reload } = useAsyncData(
        () =>
            academyHomeApi.get({
                ownerId: sessionUser.id,
                workspaceId: workspaceId || undefined,
                range,
            }),
        [sessionUser?.id, workspaceId, range],
        {
            enabled: Boolean(sessionUser?.id),
            onError: (err) => showToast(err.message || "Unable to load your dashboard.", "error"),
        },
    );

    const handleRangeChange = (value, option) => {
        setRange(value);
        showToast(`Showing ${option?.label?.toLowerCase() || value} of study activity.`, "info");
    };

    const handleRefresh = () => {
        reload();
        showToast("Dashboard refreshed.", "info");
    };

    const kpis = useMemo(() => data?.kpis || [], [data]);
    const continueLearning = data?.continueLearning;
    const courses = data?.courses || [];
    const recommendations = data?.recommendations || [];

    // Làm sạch và kiểm tra dữ liệu môn học
    const rawCode = (continueLearning?.courseCode || "").replace(/^[:\s]+|[:\s]+$/g, "").trim();
    const rawTitle = (continueLearning?.courseTitle || "").replace(/^[:\s]+|[:\s]+$/g, "").trim();
    const step = (continueLearning?.step || "").trim();
    const nextLesson = (continueLearning?.nextLesson || "").trim();

    // Điều kiện có khóa học hợp lệ: Phải có ít nhất 1 khóa học đang hoạt động và có tên/mã hợp lệ
    const hasValidCourse = Boolean(
        courses.length > 0 && (rawCode || rawTitle) && rawCode !== ":" && rawTitle !== ":",
    );

    // Tạo tiêu đề sạch tuyệt đối, chỉ nối ":" nếu cả hai đều có nội dung
    const courseDisplayTitle =
        rawCode && rawTitle ? `${rawCode}: ${rawTitle}` : rawTitle || rawCode;

    return (
        <div className="edu-home-bounds">
            {/* 1. Hero Study Banner */}
            <div className="edu-resume-hero">
                <div className="resume-hero-left">
                    <div className="resume-icon-badge">
                        {hasValidCourse ? <GraduationCap size={22} /> : <Compass size={22} />}
                    </div>
                    <div className="resume-copy">
                        {/* Dòng Eyebrow: Đổi sang EXPLORE COURSES nếu chưa có khóa học */}
                        <span className="resume-eyebrow">
                            {hasValidCourse ? "CONTINUE LEARNING" : "EXPLORE COURSES"}
                        </span>

                        {loading && !data ? (
                            <p>Loading your study plan…</p>
                        ) : hasValidCourse ? (
                            <>
                                <h3>
                                    {courseDisplayTitle}
                                    {step ? ` — ${step}` : ""}
                                </h3>
                                {nextLesson && <p>{nextLesson}</p>}
                            </>
                        ) : (
                            <>
                                <h3>Explore Courses & AI Practice</h3>
                                <p>
                                    Discover syllabi, interactive AI tutor sessions, and mock
                                    drills.
                                </p>
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
                            <span>Explore courses</span>
                            <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. KPI Metrics Grid */}
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

            {/* 3. Enrolled Courses & Quick Flashcard Grid */}
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
                                    <CheckCircle size={16} color="var(--success)" />
                                ) : (
                                    <Sparkles size={16} color="var(--warning)" />
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

export default EduHome;
