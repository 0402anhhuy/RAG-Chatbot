import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus,
    Upload,
    Trash2,
    Monitor,
    FileText,
    Bug,
    Code2,
    Database,
    Layers,
    ShieldCheck,
    Server,
    Columns3,
    Cloud,
    SlidersHorizontal,
    Rocket,
    ArrowLeftRight,
    Sparkles,
    RefreshCw,
    CloudDownload,
    Loader2,
} from "lucide-react";
import { workflowApi } from "../../../../../../api";
import CustomSelector from "../../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../../context/ToastContext";
import NewWorkflowModal from "../../components/modals/workflows/NewWorkflowModal";
import "./ProjectWorkflow.css";

// Icon của workflow lưu dưới dạng key (BE) -> component hiển thị
const ICON_MAP = {
    server: Server,
    columns: Columns3,
    cloud: Cloud,
    db: Database,
    code: Code2,
    sliders: SlidersHorizontal,
    layers: Layers,
    rocket: Rocket,
    bug: Bug,
    swap: ArrowLeftRight,
    monitor: Monitor,
    sparkles: Sparkles,
    refresh: RefreshCw,
    file: FileText,
    shield: ShieldCheck,
};

const TYPE_LABELS = {
    BUILT_IN: "BUILT-IN",
    CUSTOM: "CUSTOM",
};

// options cho CustomSelector chung
const TYPE_OPTIONS = [
    { value: "ALL", label: "All workflows" },
    { value: "BUILT_IN", label: "Built-In" },
    { value: "CUSTOM", label: "Custom" },
];

const SORT_OPTIONS = [
    { value: "created", label: "Newest first" },
    { value: "name", label: "Name A-Z" },
    { value: "nodes", label: "Most nodes" },
];

const ProjectWorkflow = ({ project = null }) => {
    const { showToast } = useToast();
    const projectId = project?.id || null;

    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("created");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const loadWorkflows = useCallback(
        async (signal) => {
            if (!projectId) {
                setWorkflows([]);
                return;
            }
            try {
                setLoading(true);
                setError("");
                const data = await workflowApi.list(projectId);
                if (!signal?.cancelled) setWorkflows(data || []);
            } catch (err) {
                if (signal?.cancelled) return;
                setWorkflows([]);
                setError(err.message || "Unable to load workflows.");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [projectId],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadWorkflows(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadWorkflows]);

    const builtInCount = workflows.filter((item) => item.type === "BUILT_IN").length;
    const customCount = workflows.filter((item) => item.type === "CUSTOM").length;

    const visibleWorkflows = useMemo(() => {
        const filtered =
            typeFilter === "ALL" ? workflows : workflows.filter((item) => item.type === typeFilter);

        return [...filtered].sort((a, b) => {
            if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
            if (sortBy === "nodes") return (b.nodeCount || 0) - (a.nodeCount || 0);
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [workflows, typeFilter, sortBy]);

    // Modal tự gọi BE để tạo workflow, trả về bản ghi vừa tạo
    const handleCreated = (created) => {
        if (created) setWorkflows((prev) => [...prev, created]);
        setTypeFilter((prev) => (prev === "BUILT_IN" ? "ALL" : prev));
        showToast("Workflow created.", "success");
    };

    const handleDeleteWorkflow = async (workflow) => {
        if (!projectId || deletingId) return;
        setDeletingId(workflow.id);
        try {
            await workflowApi.remove(projectId, workflow.id);
            setWorkflows((prev) => prev.filter((item) => item.id !== workflow.id));
            showToast("Workflow deleted.", "success");
        } catch (err) {
            showToast(err.message || "Unable to delete the workflow.", "error");
        } finally {
            setDeletingId(null);
        }
    };

    if (!projectId) {
        return (
            <div className="vibe-workflows-viewport">
                <div className="workflows-state-row" role="alert">
                    Open a project first to see its workflows.
                </div>
            </div>
        );
    }

    return (
        <div className="vibe-workflows-viewport">
            {/* Thanh lọc & action */}
            <div className="workflows-filter-control-bar">
                <div className="workflows-filter-selectors">
                    <CustomSelector
                        options={TYPE_OPTIONS}
                        value={typeFilter}
                        onChange={(value) => setTypeFilter(value)}
                        placeholder="All workflows"
                    />
                    <CustomSelector
                        options={SORT_OPTIONS}
                        value={sortBy}
                        onChange={(value) => setSortBy(value)}
                        placeholder="Sort by..."
                    />
                </div>

                <div className="workflows-top-actions-cluster">
                    <button
                        type="button"
                        className="btn-import-workflow-white"
                        onClick={() => showToast("Import from JSON is not available yet.", "info")}
                    >
                        <Upload size={14} />
                        <span>Import</span>
                    </button>

                    <button
                        type="button"
                        className="btn-new-workflow-black"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus size={15} />
                        <span>New Workflow</span>
                    </button>
                </div>
            </div>

            <div className="workflows-count-row">
                {workflows.length} workflows · {builtInCount} built-in · {customCount} custom
            </div>

            {loading && (
                <div className="workflows-state-row">
                    <Loader2 size={15} className="workflows-spin" />
                    <span>Loading workflows...</span>
                </div>
            )}

            {!loading && error && (
                <div className="workflows-state-row workflows-state-error" role="alert">
                    <span>{error}</span>
                    <button
                        type="button"
                        className="btn-import-workflow-white"
                        onClick={() => loadWorkflows()}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && (
                <div className="workflows-cards-grid">
                    {visibleWorkflows.length === 0 ? (
                        <div className="workflows-empty-well">
                            <CloudDownload size={18} />
                            <span>No workflows match this filter.</span>
                        </div>
                    ) : (
                        visibleWorkflows.map((item) => {
                            const IconComponent = ICON_MAP[item.iconKey] || Layers;
                            const isBuiltIn = item.type === "BUILT_IN";

                            return (
                                <div key={item.id} className="workflow-card-surface">
                                    <div
                                        className="card-top-accent-line"
                                        style={{ backgroundColor: item.color }}
                                    />

                                    <div className="workflow-card-header-line">
                                        <div className="workflow-card-identity">
                                            <div
                                                className="workflow-icon-well"
                                                style={{ color: item.color }}
                                            >
                                                <IconComponent size={18} />
                                            </div>
                                            <strong className="workflow-title-text">
                                                {item.name}
                                            </strong>
                                        </div>

                                        {!isBuiltIn && (
                                            <button
                                                type="button"
                                                className="btn-card-more-menu btn-card-remove"
                                                title="Delete workflow"
                                                disabled={deletingId === item.id}
                                                onClick={() => handleDeleteWorkflow(item)}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>

                                    <p className="workflow-steps-flow-text">
                                        {item.stepsSummary || item.description || "No steps yet."}
                                    </p>

                                    <div className="workflow-card-bottom-meta">
                                        <span className="workflow-type-tag">
                                            {TYPE_LABELS[item.type] || item.type}
                                        </span>
                                        <span className="workflow-node-count">
                                            {item.nodeCount}{" "}
                                            {item.nodeCount === 1 ? "node" : "nodes"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modal tạo workflow mới */}
            <NewWorkflowModal
                isOpen={isCreateModalOpen}
                projectId={projectId}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={handleCreated}
            />
        </div>
    );
};

export default ProjectWorkflow;
