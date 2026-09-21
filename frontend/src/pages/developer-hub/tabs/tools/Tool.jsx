import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Code2, PenTool, Terminal } from "lucide-react";
import "./Tool.css";

const TOOLS_CONFIG = [
    {
        id: "code_review",
        title: "Source Code Review",
        description:
            "Deep static analysis detecting SQLi, XSS, memory leaks, and architectural smells.",
        icon: Code2,
        accent: "#0284c7",
        badge: "STATIC SAST",
        route: "/chat?tool=code_review",
        metrics: "3 critical issues detected",
    },
    {
        id: "canvas",
        title: "Architecture Canvas",
        description:
            "Interactive system design board modeling microservice dependencies and topologies.",
        icon: PenTool,
        accent: "#059669",
        badge: "SYSTEM DESIGN",
        route: "/canvas",
        metrics: "Topology v2.4 live sync",
    },
    {
        id: "knowledge",
        title: "Knowledge Assistant",
        description:
            "Retrieval-Augmented Generation querying technical specifications and RFC handbooks.",
        icon: BookOpen,
        accent: "#d97706",
        badge: "RAG STORE",
        route: "/chat?tool=knowledge_assistant",
        metrics: "128 Markdown/PDFs vectorized",
    },
    {
        id: "sandbox_runner",
        title: "Isolated Code Sandbox",
        description:
            "Read-only container executing unit testing scenarios and performance benchmarks.",
        icon: Terminal,
        accent: "#7c3aed",
        badge: "RUNTIME",
        route: "/chat?tool=sandbox",
        metrics: "Connected to alpine-node:20",
    },
];

const Tool = ({ onLaunchTool }) => {
    const navigate = useNavigate();

    const handleActionClick = (tool) => {
        if (onLaunchTool) {
            onLaunchTool(tool.id);
        } else {
            navigate(tool.route);
        }
    };

    return (
        <div className="tab-body-container">
            <div className="tab-header-banner">
                <h2>Developer Tool Suite</h2>
                <span>4 integrated engineering tools</span>
            </div>

            <div className="tools-matrix-grid">
                {TOOLS_CONFIG.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <div
                            key={tool.id}
                            className="dev-tool-surface-card"
                            onClick={() => handleActionClick(tool)}
                        >
                            <div className="tool-card-topbar">
                                <div
                                    className="tool-glyph-frame"
                                    style={{
                                        color: tool.accent,
                                        backgroundColor: `${tool.accent}14`,
                                    }}
                                >
                                    <Icon size={20} />
                                </div>
                                <span className="tool-category-badge">{tool.badge}</span>
                            </div>

                            <div className="tool-card-narrative">
                                <h3>{tool.title}</h3>
                                <p>{tool.description}</p>
                            </div>

                            <div className="tool-card-bottom-row">
                                <span className="tool-health-meta">{tool.metrics}</span>
                                <button type="button" className="tool-launch-btn">
                                    <span>Launch</span>
                                    <ArrowRight size={13} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Tool;
