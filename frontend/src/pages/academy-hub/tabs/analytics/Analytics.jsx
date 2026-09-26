import { useState } from "react";
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    Award,
    BarChart3,
    BookOpen,
    CheckCircle2,
    Clock,
    Flame,
    GraduationCap,
    RotateCcw,
    Sparkles,
    Target,
    TrendingUp,
} from "lucide-react";
import "./Analytics.css";

const SKILL_METRICS = [
    {
        skill: "Data Structures & Algorithms",
        mastery: 92,
        status: "Advanced",
        course: "CS204",
        color: "#059669",
    },
    {
        skill: "System Design & Microservices",
        mastery: 68,
        status: "Proficient",
        course: "SE301",
        color: "#0284c7",
    },
    {
        skill: "Agentic RAG & GraphRAG",
        mastery: 85,
        status: "Advanced",
        course: "AI402",
        color: "#8b5cf6",
    },
    {
        skill: "Database Optimization & SQL",
        mastery: 74,
        status: "Proficient",
        course: "CS204",
        color: "#d97706",
    },
    {
        skill: "Security Standards (SAST/OWASP)",
        mastery: 58,
        status: "Needs Practice",
        course: "SE301",
        color: "#ef4444",
    },
];

const KNOWLEDGE_GAPS = [
    {
        id: "gap-1",
        topic: "Dijkstra Priority Queue Optimization",
        course: "CS204",
        impact: "High",
        reason: "Failed 2 out of 3 questions concerning O(E log V) time complexity on the latest assessment drill.",
        suggestedTool: "tutor",
    },
    {
        id: "gap-2",
        topic: "Outbox Pattern vs Dual-Write Anti-pattern",
        course: "SE301",
        impact: "Medium",
        reason: "Pending assignment submission on Event-Driven distributed transactions.",
        suggestedTool: "exam_prep",
    },
    {
        id: "gap-3",
        topic: "Vector Chunking Overlap & Context Bleed",
        course: "AI402",
        impact: "Low",
        reason: "Review required on context window boundaries and retrieval trade-offs.",
        suggestedTool: "tutor",
    },
];

const RECENT_TEST_SCORES = [
    {
        exam: "CS204: Dynamic Programming Midterm Drill",
        score: 94,
        date: "Yesterday",
        delta: "+8%",
    },
    {
        exam: "SE301: Microservices Design Pattern Quiz",
        score: 78,
        date: "3 days ago",
        delta: "-4%",
    },
    {
        exam: "AI402: Vector DB & Hybrid Search Evaluation",
        score: 90,
        date: "1 week ago",
        delta: "+12%",
    },
    {
        exam: "CS204: Graph Traversal & MST Assessment",
        score: 85,
        date: "2 weeks ago",
        delta: "+5%",
    },
];

const Analytics = ({ onLaunchTool }) => {
    const [timeRange, setTimeRange] = useState("30d");

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
                    <button
                        type="button"
                        className={`toggle-btn ${timeRange === "7d" ? "active" : ""}`}
                        onClick={() => setTimeRange("7d")}
                    >
                        7 Days
                    </button>
                    <button
                        type="button"
                        className={`toggle-btn ${timeRange === "30d" ? "active" : ""}`}
                        onClick={() => setTimeRange("30d")}
                    >
                        30 Days
                    </button>
                    <button
                        type="button"
                        className={`toggle-btn ${timeRange === "all" ? "active" : ""}`}
                        onClick={() => setTimeRange("all")}
                    >
                        Full Term
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
                    <div className="kpi-big-num green">89.4%</div>
                    <span className="kpi-footnote">
                        <TrendingUp size={12} /> Top 5th percentile cohort standing
                    </span>
                </div>

                <div className="kpi-score-card">
                    <div className="kpi-top">
                        <span className="kpi-label">Socratic Tutoring Hours</span>
                        <Clock size={14} className="kpi-icon-blue" />
                    </div>
                    <div className="kpi-big-num">24.5h</div>
                    <span className="kpi-footnote">+4.2h compared to last week</span>
                </div>

                <div className="kpi-score-card">
                    <div className="kpi-top">
                        <span className="kpi-label">Assessment Accuracy</span>
                        <CheckCircle2 size={14} className="kpi-icon-purple" />
                    </div>
                    <div className="kpi-big-num">91.8%</div>
                    <span className="kpi-footnote">Across 340 evaluated questions</span>
                </div>

                <div className="kpi-score-card">
                    <div className="kpi-top">
                        <span className="kpi-label">Identified Knowledge Gaps</span>
                        <AlertTriangle size={14} className="kpi-icon-amber" />
                    </div>
                    <div className="kpi-big-num amber">3 Topics</div>
                    <span className="kpi-footnote">2 high-priority concepts</span>
                </div>
            </div>

            {/* Middle Section: Competency Mastery Breakdown vs Recent Scores */}
            <div className="analytics-middle-grid">
                {/* Left Column: Skill Matrix */}
                <div className="analytics-card-surface">
                    <div className="card-head-title">
                        <strong>Technical Competency Breakdown</strong>
                        <span className="badge-indexed">Syllabus-Aligned</span>
                    </div>

                    <div className="skills-meter-list">
                        {SKILL_METRICS.map((item, idx) => (
                            <div key={idx} className="skill-meter-row">
                                <div className="meter-label-row">
                                    <div className="skill-name-col">
                                        <code className="course-code-tag">{item.course}</code>
                                        <strong>{item.skill}</strong>
                                    </div>
                                    <div className="meter-val-col">
                                        <span
                                            className={`status-text ${item.status === "Needs Practice" ? "warn" : ""}`}
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
                        ))}
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
                        {RECENT_TEST_SCORES.map((item, idx) => (
                            <div key={idx} className="score-row-item">
                                <div className="score-main-info">
                                    <strong>{item.exam}</strong>
                                    <span className="score-date-text">{item.date}</span>
                                </div>
                                <div className="score-result-col">
                                    <span className="score-number-pill">{item.score}/100</span>
                                    <span
                                        className={`score-delta ${item.delta.startsWith("+") ? "pos" : "neg"}`}
                                    >
                                        {item.delta}
                                    </span>
                                </div>
                            </div>
                        ))}
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
                    <button
                        type="button"
                        className="btn-fix-all"
                        onClick={() => onLaunchTool && onLaunchTool("tutor")}
                    >
                        <span>Launch Remediation Track</span>
                        <ArrowUpRight size={14} />
                    </button>
                </div>

                <div className="gaps-cards-grid">
                    {KNOWLEDGE_GAPS.map((gap) => (
                        <div key={gap.id} className="gap-action-card">
                            <div className="gap-card-topbar">
                                <span className="gap-course-badge">{gap.course}</span>
                                <span className={`gap-priority-pill ${gap.impact.toLowerCase()}`}>
                                    Priority: {gap.impact}
                                </span>
                            </div>

                            <strong className="gap-topic-title">{gap.topic}</strong>
                            <p className="gap-reason-desc">{gap.reason}</p>

                            <div className="gap-card-footer">
                                <button
                                    type="button"
                                    className="btn-remediate-now"
                                    onClick={() => onLaunchTool && onLaunchTool(gap.suggestedTool)}
                                >
                                    <GraduationCap size={13} />
                                    <span>Remediate with Socratic Tutor</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
