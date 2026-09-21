import { useNavigate } from "react-router-dom";
import {
    ArrowRight,
    CheckSquare,
    DollarSign,
    FolderKanban,
    GitBranch,
    MessageSquare,
    Play,
    Plus,
    Terminal,
} from "lucide-react";
import "./Home.css";

const Home = ({ onNavigateTab }) => {
    const navigate = useNavigate();

    const metrics = [
        { label: "Active sandboxes", val: "0", note: "none idle", icon: Terminal },
        { label: "Open tasks", val: "0", note: "assigned to you", icon: CheckSquare },
        { label: "My projects", val: "2", note: "active", icon: FolderKanban },
        { label: "Cost this month", val: "$1.75", note: "1.9M tokens", icon: DollarSign },
        {
            label: "Lines this month",
            val: "+64 -0",
            note: "across your runs",
            icon: GitBranch,
            color: "#10b981",
        },
        { label: "Conversations", val: "2", note: "agent chats", icon: MessageSquare },
    ];

    const recentConversations = [
        {
            id: 1,
            title: "Why isEdit=false users can link/unlink tools",
            date: "2d ago",
            model: "gemini-1.5-flash",
        },
        {
            id: 2,
            title: "DMS AI Hub reuse analysis for SyteLine",
            date: "4d ago",
            model: "DeepSeek-V4-Flash",
        },
        { id: 3, title: "Locating aside component in code", date: "8/26/2026", model: "GLM-4.2" },
        {
            id: 4,
            title: "Greeting & Architecture Setup",
            date: "8/24/2026",
            model: "DeepSeek-V4-Flash",
        },
    ];

    return (
        <div className="tab-body-container">
            {/* Top Resume Banner */}
            <div className="home-resume-hero">
                <div className="resume-hero-left">
                    <div className="resume-icon-badge">
                        <Play size={18} />
                    </div>
                    <div className="resume-copy">
                        <span className="resume-eyebrow">WELCOME BACK, HUY</span>
                        <h3>Continue "Main" in dmsaihub</h3>
                        <p>Pick up your most recent working sandbox, right where you left it.</p>
                    </div>
                </div>
                <button
                    type="button"
                    className="btn-continue-work"
                    onClick={() => navigate("/chat?tool=code_review")}
                >
                    <span>Continue</span>
                    <ArrowRight size={14} />
                </button>
            </div>

            {/* Metrics KPI Grid */}
            <div className="home-kpi-grid">
                {metrics.map((m, idx) => {
                    const Icon = m.icon;
                    return (
                        <div key={idx} className="kpi-metric-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">{m.label}</span>
                                <Icon size={14} className="kpi-icon-muted" />
                            </div>
                            <div className="kpi-value" style={m.color ? { color: m.color } : {}}>
                                {m.val}
                            </div>
                            <span className="kpi-sub-note">{m.note}</span>
                        </div>
                    );
                })}
            </div>

            {/* 3-Column Activities Stream */}
            <div className="home-three-stream-grid">
                {/* Conversations Column */}
                <div className="stream-column-card">
                    <div className="stream-header-row">
                        <div className="stream-title-group">
                            <MessageSquare size={14} />
                            <strong>Conversations</strong>
                            <span className="stream-badge-latest">LATEST</span>
                        </div>
                        <button
                            type="button"
                            className="btn-text-link"
                            onClick={() => onNavigateTab("conversations")}
                        >
                            View all →
                        </button>
                    </div>
                    <div className="stream-items-list">
                        {recentConversations.map((item) => (
                            <div
                                key={item.id}
                                className="stream-convo-item"
                                onClick={() => navigate("/chat?tool=knowledge_assistant")}
                            >
                                <span className="convo-bullet" />
                                <div className="convo-meta-wrap">
                                    <strong className="convo-title-line">{item.title}</strong>
                                    <div className="convo-sub-line">
                                        <span>{item.date}</span>
                                        <span>·</span>
                                        <small>{item.model}</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sandboxes Column */}
                <div className="stream-column-card">
                    <div className="stream-header-row">
                        <div className="stream-title-group">
                            <Terminal size={14} />
                            <strong>Sandboxes</strong>
                        </div>
                        <button
                            type="button"
                            className="btn-text-link"
                            onClick={() => onNavigateTab("sandboxes")}
                        >
                            View all →
                        </button>
                    </div>
                    <div className="stream-empty-fill">
                        <span>No sandboxes active.</span>
                    </div>
                </div>

                {/* Tasks Column */}
                <div className="stream-column-card">
                    <div className="stream-header-row">
                        <div className="stream-title-group">
                            <CheckSquare size={14} />
                            <strong>Tasks</strong>
                        </div>
                        <button
                            type="button"
                            className="btn-text-link"
                            onClick={() => onNavigateTab("tasks")}
                        >
                            View all →
                        </button>
                    </div>
                    <div className="stream-empty-fill">
                        <span>No open tasks assigned to you.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
