import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus,
    Trash2,
    Cpu,
    FileText,
    FilePlus,
    Server,
    Code2,
    Search,
    Scan,
    Database,
    Cloud,
    Shield,
    TestTube,
    Columns3,
    Palette,
    Monitor,
    GitBranch,
    Terminal,
    Globe,
    BookOpen,
    BarChart3,
    Wrench,
    Zap,
    Printer,
    Network,
    Plug,
    Pencil,
    Target,
    Microscope,
    Lightbulb,
    RefreshCw,
    Loader2,
    CloudDownload,
} from "lucide-react";
import { agentApi } from "../../../../../../api";
import CustomSelector from "../../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../../context/ToastContext";
import CreateAgentModal from "../../components/modals/agents/CreateAgentModal";
import "./ProjectAgent.css";

// Icon của agent lưu dưới dạng key (BE) -> component hiển thị
const ICON_MAP = {
    bot: Cpu,
    server: Server,
    code: Code2,
    file: FileText,
    "file-plus": FilePlus,
    search: Search,
    scan: Scan,
    db: Database,
    cloud: Cloud,
    shield: Shield,
    "test-tube": TestTube,
    columns: Columns3,
    palette: Palette,
    monitor: Monitor,
    git: GitBranch,
    terminal: Terminal,
    globe: Globe,
    book: BookOpen,
    chart: BarChart3,
    wrench: Wrench,
    zap: Zap,
    printer: Printer,
    network: Network,
    plug: Plug,
    pencil: Pencil,
    target: Target,
    microscope: Microscope,
    lightbulb: Lightbulb,
    refresh: RefreshCw,
};

const TYPE_LABELS = {
    BUILT_IN: "BUILT-IN",
    CUSTOM: "CUSTOM",
};

// options cho CustomSelector chung
const TYPE_OPTIONS = [
    { value: "ALL", label: "All agents" },
    { value: "BUILT_IN", label: "Built-In" },
    { value: "CUSTOM", label: "Custom" },
];

const SORT_OPTIONS = [
    { value: "created", label: "Newest first" },
    { value: "name", label: "Name A-Z" },
];

const ProjectAgent = ({ project = null }) => {
    const { showToast } = useToast();
    const projectId = project?.id || null;

    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("created");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const loadAgents = useCallback(
        async (signal) => {
            if (!projectId) {
                setAgents([]);
                return;
            }
            try {
                setLoading(true);
                setError("");
                const data = await agentApi.list(projectId);
                if (!signal?.cancelled) setAgents(data || []);
            } catch (err) {
                if (signal?.cancelled) return;
                setAgents([]);
                setError(err.message || "Unable to load agents.");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [projectId],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadAgents(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadAgents]);

    const builtInCount = agents.filter((item) => item.type === "BUILT_IN").length;
    const customCount = agents.filter((item) => item.type === "CUSTOM").length;

    const visibleAgents = useMemo(() => {
        const filtered =
            typeFilter === "ALL" ? agents : agents.filter((item) => item.type === typeFilter);

        return [...filtered].sort((a, b) => {
            if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [agents, typeFilter, sortBy]);

    // Modal tự gọi BE để tạo agent, trả về bản ghi vừa tạo
    const handleCreated = (created) => {
        if (created) setAgents((prev) => [...prev, created]);
        setTypeFilter((prev) => (prev === "BUILT_IN" ? "ALL" : prev));
        showToast("Agent created.", "success");
    };

    const handleDeleteAgent = async (agent) => {
        if (!projectId || deletingId) return;
        setDeletingId(agent.id);
        try {
            await agentApi.remove(projectId, agent.id);
            setAgents((prev) => prev.filter((item) => item.id !== agent.id));
            showToast("Agent deleted.", "success");
        } catch (err) {
            showToast(err.message || "Unable to delete the agent.", "error");
        } finally {
            setDeletingId(null);
        }
    };

    if (!projectId) {
        return (
            <div className="vibe-agents-viewport">
                <div className="agents-state-row" role="alert">
                    Open a project first to see its agents.
                </div>
            </div>
        );
    }

    return (
        <div className="vibe-agents-viewport">
            {/* Header Filter Control Bar */}
            <div className="agents-filter-control-bar">
                <div className="agents-filter-selectors">
                    <CustomSelector
                        options={TYPE_OPTIONS}
                        value={typeFilter}
                        onChange={(value) => setTypeFilter(value)}
                        placeholder="All agents"
                    />
                    <CustomSelector
                        options={SORT_OPTIONS}
                        value={sortBy}
                        onChange={(value) => setSortBy(value)}
                        placeholder="Sort by..."
                    />
                </div>

                <button
                    type="button"
                    className="btn-new-agent-black"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={15} />
                    <span>New Agent</span>
                </button>
            </div>

            <div className="agents-count-row">
                {agents.length} agents · {builtInCount} built-in · {customCount} custom
            </div>

            {loading && (
                <div className="agents-state-row">
                    <Loader2 size={15} className="agents-spin" />
                    <span>Loading agents...</span>
                </div>
            )}

            {!loading && error && (
                <div className="agents-state-row agents-state-error" role="alert">
                    <span>{error}</span>
                    <button
                        type="button"
                        className="btn-import-agent-white"
                        onClick={() => loadAgents()}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && (
                <div className="agents-cards-grid">
                    {visibleAgents.length === 0 ? (
                        <div className="agents-empty-well">
                            <CloudDownload size={18} />
                            <span>No agents match this filter.</span>
                        </div>
                    ) : (
                        visibleAgents.map((agent) => {
                            const IconComp = ICON_MAP[agent.iconKey] || Cpu;
                            const isBuiltIn = agent.type === "BUILT_IN";

                            return (
                                <div key={agent.id} className="agent-card-surface">
                                    {/* Dải line màu ở đỉnh đầu thẻ */}
                                    <div
                                        className="agent-card-top-line"
                                        style={{ backgroundColor: agent.color }}
                                    />

                                    {/* Header Thẻ: Icon + Tên Agent + Xoá */}
                                    <div className="agent-card-header-line">
                                        <div className="agent-card-identity">
                                            <div
                                                className="agent-icon-well"
                                                style={{ color: agent.color }}
                                            >
                                                <IconComp size={16} />
                                            </div>
                                            <strong className="agent-name-text">
                                                {agent.name}
                                            </strong>
                                        </div>

                                        {!isBuiltIn && (
                                            <button
                                                type="button"
                                                className="btn-card-more-menu btn-card-remove"
                                                title="Delete agent"
                                                disabled={deletingId === agent.id}
                                                onClick={() => handleDeleteAgent(agent)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Mô tả nhiệm vụ */}
                                    <p className="agent-desc-text">
                                        {agent.description || "No description yet."}
                                    </p>

                                    {/* Chân Thẻ: Badge Built-in & Quyền hạn */}
                                    <div className="agent-card-footer">
                                        <span className="agent-badge-type">
                                            {TYPE_LABELS[agent.type] || agent.type}
                                        </span>
                                        <div className="agent-permission-tag">
                                            <Shield size={11} className="perm-shield-icon" />
                                            <span>{agent.permissions || "Scoped edits"}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modal Create Agent */}
            <CreateAgentModal
                isOpen={isCreateModalOpen}
                projectId={projectId}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={handleCreated}
            />
        </div>
    );
};

export default ProjectAgent;
