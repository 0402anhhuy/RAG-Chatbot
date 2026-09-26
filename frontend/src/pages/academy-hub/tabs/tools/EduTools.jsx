import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, Sparkles } from "lucide-react";
import "./EduTools.css";

const EDU_TOOLS_CONFIG = [
    {
        id: "tutor",
        title: "Socratic Code Tutor",
        description:
            "Line-by-line interactive tutoring breaking down algorithms, data structures, and clean coding principles.",
        icon: GraduationCap,
        accent: "#059669",
        badge: "SOCRATIC AI",
        metrics: "Module 4 active",
    },
    {
        id: "exam_prep",
        title: "Exam & Quiz Prep",
        description:
            "Generate adaptive mock assessments, multiple-choice questions, and flashcards directly from syllabus slides.",
        icon: Sparkles,
        accent: "#d97706",
        badge: "ADAPTIVE DRILL",
        metrics: "24 questions in pool",
    },
    {
        id: "grader",
        title: "Assignment Grader",
        description:
            "Automated grading assistant reviewing test cases, time complexity (Big-O), and architectural rubrics.",
        icon: CheckCircle2,
        accent: "#0284c7",
        badge: "AUTO RUBRIC",
        metrics: "Rubric v3 ready",
    },
    {
        id: "courseware",
        title: "Courseware RAG Index",
        description:
            "Search and query across textbooks, slide decks, lab requirements, and university documentation.",
        icon: BookOpen,
        accent: "#7c3aed",
        badge: "VECTOR RETRIEVAL",
        metrics: "42 syllabus vectorized",
    },
];

const EduTools = ({ onLaunchTool }) => {
    return (
        <div className="tab-body-container">
            <div className="tab-header-banner">
                <h2>Academy Tool Suite</h2>
                <span>4 integrated AI learning & tutoring engines</span>
            </div>

            <div className="tools-matrix-grid">
                {EDU_TOOLS_CONFIG.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <div
                            key={tool.id}
                            className="dev-tool-surface-card"
                            onClick={() => onLaunchTool && onLaunchTool(tool.id)}
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

// ĐẢM BẢO CÓ DÒNG NÀY ĐỂ HẾT LỖI SyntaxError
export default EduTools;
