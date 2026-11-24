import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, Loader2, Sparkles } from "lucide-react";
import { academyToolApi } from "../../../../api";
import { useToast } from "../../../../context/ToastContext";
import "./EduTools.css";
import { getSessionUser } from "../../../../components/common/utils/session";

// Icon theo tool id do BE trả về (BE chỉ trả id, FE giữ phần trình bày).
const TOOL_ICONS = {
    tutor: GraduationCap,
    exam_prep: Sparkles,
    grader: CheckCircle2,
    courseware: BookOpen,
};

const EduTools = ({ onLaunchTool }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadTools = useCallback(
        async (signal) => {
            if (!sessionUser?.id) {
                setData(null);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const response = await academyToolApi.list(sessionUser.id);
                if (signal?.cancelled) return;
                setData(response);
            } catch (err) {
                if (signal?.cancelled) return;
                setData(null);
                showToast(err.message || "Unable to load the tool suite.", "error");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [sessionUser?.id, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadTools(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadTools]);

    const tools = data?.tools || [];

    const handleLaunch = (tool) => {
        // Tool chưa đủ điều kiện vẫn mở được: workspace hiển thị đúng việc cần làm.
        if (!tool.runnable) {
            showToast(tool.blockedReason || "This tool needs more setup.", "warning");
        }
        onLaunchTool?.(tool.id);
    };

    return (
        <div className="edu-tools-bounds">
            <div className="edu-tools-header">
                <div>
                    <h2>Academy Tool Suite</h2>
                    <span>
                        {data
                            ? `${tools.length} integrated AI learning engines · ${data.documentCount} indexed source${
                                  data.documentCount === 1 ? "" : "s"
                              }`
                            : "Loading your learning engines..."}
                    </span>
                </div>
                {data && (
                    <span className="edu-tools-active-chip">
                        {data.activeToolCount}/{tools.length} ready
                    </span>
                )}
            </div>

            {loading ? (
                <div className="edu-tools-state">
                    <Loader2 size={16} className="edu-tools-spinner" />
                    <span>Loading tools...</span>
                </div>
            ) : tools.length === 0 ? (
                <div className="edu-tools-state">
                    <span>
                        {sessionUser?.id
                            ? "No tool available yet. Upload course material to get started."
                            : "Please sign in again to use the tool suite."}
                    </span>
                </div>
            ) : (
                <div className="tools-matrix-grid">
                    {tools.map((tool) => {
                        const Icon = TOOL_ICONS[tool.id] || Sparkles;
                        return (
                            <button
                                key={tool.id}
                                type="button"
                                className={`dev-tool-surface-card ${tool.runnable ? "" : "is-blocked"}`}
                                onClick={() => handleLaunch(tool)}
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
                                    <span className="tool-launch-btn">
                                        <span>{tool.primaryAction}</span>
                                        <ArrowRight size={13} />
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default EduTools;
