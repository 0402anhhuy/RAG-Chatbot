import {
    ArrowRight,
    BookOpen,
    CheckCircle,
    Clock,
    Flame,
    GraduationCap,
    Play,
    Sparkles,
} from "lucide-react";
import "./EduHome.css";

const EduHome = ({ onNavigateTab, onLaunchTool }) => {
    const kpis = [
        { label: "Active Courses", val: "6", note: "enrolled", icon: BookOpen },
        {
            label: "Average Mastery",
            val: "89%",
            note: "top 5% percentile",
            icon: CheckCircle,
            color: "#059669",
        },
        { label: "Quizzes Solved", val: "48", note: "+12 this week", icon: Sparkles },
        { label: "Study Time", val: "18.4h", note: "this month", icon: Clock },
    ];

    const currentCourses = [
        {
            id: 1,
            code: "CS204",
            title: "Algorithms & Complexity",
            progress: 75,
            nextLesson: "Dynamic Programming",
        },
        {
            id: 2,
            code: "SE301",
            title: "Software Architecture & Design Patterns",
            progress: 60,
            nextLesson: "Event-Driven & Microservices",
        },
        {
            id: 3,
            code: "AI402",
            title: "Large Language Models & Agentic RAG",
            progress: 92,
            nextLesson: "GraphRAG & Knowledge Graphs",
        },
    ];

    return (
        <div className="edu-home-bounds">
            {/* Hero Study Banner */}
            <div className="edu-resume-hero">
                <div className="resume-hero-left">
                    <div className="resume-icon-badge">
                        <GraduationCap size={20} />
                    </div>
                    <div className="resume-copy">
                        <span className="resume-eyebrow">CONTINUE LEARNING</span>
                        <h3>CS204: Algorithms & Complexity — Module 4</h3>
                        <p>
                            Pick up Socratic step-by-step tutoring on Shortest Path & Dijkstra
                            optimizations.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    className="btn-continue-edu"
                    onClick={() => onLaunchTool("tutor")}
                >
                    <span>Resume with Tutor</span>
                    <ArrowRight size={14} />
                </button>
            </div>

            {/* KPI Metrics */}
            <div className="edu-kpi-grid">
                {kpis.map((k, i) => {
                    const Icon = k.icon;
                    return (
                        <div key={i} className="edu-kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">{k.label}</span>
                                <Icon size={14} className="kpi-icon-muted" />
                            </div>
                            <div className="kpi-value" style={k.color ? { color: k.color } : {}}>
                                {k.val}
                            </div>
                            <span className="kpi-sub-note">{k.note}</span>
                        </div>
                    );
                })}
            </div>

            {/* Enrolled Courses & Quick Flashcard Grid */}
            <div className="edu-split-sections">
                <div className="courses-progress-card">
                    <div className="section-title-row">
                        <strong>Current Syllabus Progress</strong>
                        <button
                            type="button"
                            className="btn-text-link"
                            onClick={() => onNavigateTab("courses")}
                        >
                            All courses →
                        </button>
                    </div>

                    <div className="course-progress-list">
                        {currentCourses.map((c) => (
                            <div key={c.id} className="course-progress-item">
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
                                    <small>Next: {c.nextLesson}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Study Assistant Recommendations */}
                <div className="ai-recs-card">
                    <div className="section-title-row">
                        <strong>Instant AI Drill & Mock Exam</strong>
                    </div>
                    <p className="ai-rec-intro">
                        Practice weak concepts detected from your latest assignment rubrics.
                    </p>
                    <div className="drill-action-boxes">
                        <div className="drill-box" onClick={() => onLaunchTool("exam_prep")}>
                            <Sparkles size={16} color="#f59e0b" />
                            <div>
                                <strong>10 Quick Dynamic Programming Quizzes</strong>
                                <small>Estimated: 15 mins · Adaptive difficulty</small>
                            </div>
                        </div>
                        <div className="drill-box" onClick={() => onLaunchTool("grader")}>
                            <CheckCircle size={16} color="#059669" />
                            <div>
                                <strong>Submit Lab 3 Assignment</strong>
                                <small>Instant syntax, clean code & rubric scoring</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EduHome;
