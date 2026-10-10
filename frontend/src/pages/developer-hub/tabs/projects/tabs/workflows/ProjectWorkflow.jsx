import { useState } from "react";
import {
    Plus,
    Upload,
    MoreHorizontal,
    Monitor,
    FileText,
    Bug,
    Code2,
    Database,
    Layers,
    ShieldCheck,
} from "lucide-react";
import NewWorkflowModal from "../../components/modals/workflows/NewWorkflowModal";
import "./ProjectWorkflow.css";

const INITIAL_WORKFLOWS = [
    {
        id: "rfp-to-demo",
        title: "RFP to Demo",
        steps: "PDF → PM → (SA || Cloud) → PM Review → Slides → (Backend || Frontend)",
        type: "BUILT-IN",
        nodesCount: 6,
        color: "#06b6d4", // Cyan
        icon: Monitor,
    },
    {
        id: "rfp-to-proposal",
        title: "RFP to Proposal",
        steps: "PDF → PM → (SA || Cloud) → PM Review → Slides (no code demo)",
        type: "BUILT-IN",
        nodesCount: 5,
        color: "#6366f1", // Indigo
        icon: FileText,
    },
    {
        id: "bug-fix-pipeline",
        title: "Bug Fix Pipeline",
        steps: "Analyze → Fix → Test || Review",
        type: "BUILT-IN",
        nodesCount: 3,
        color: "#ef4444", // Red
        icon: Bug,
    },
    {
        id: "code-review-pipeline",
        title: "Code Review Pipeline",
        steps: "Static Analysis || AI Review → Summary",
        type: "BUILT-IN",
        nodesCount: 2,
        color: "#f59e0b", // Amber
        icon: Code2,
    },
    {
        id: "db-migration-pipeline",
        title: "DB Migration Pipeline",
        steps: "Design → Generate → Test Rollback || Review",
        type: "BUILT-IN",
        nodesCount: 3,
        color: "#ec4899", // Pink
        icon: Database,
    },
    {
        id: "feature-development",
        title: "Feature Development",
        steps: "Architect → Backend || Frontend → Review",
        type: "BUILT-IN",
        nodesCount: 3,
        color: "#8b5cf6", // Purple
        icon: Layers,
    },
    {
        id: "full-stack-dev",
        title: "Full-Stack Development",
        steps: "Architect → Backend || Frontend → Integration Test → Review",
        type: "BUILT-IN",
        nodesCount: 4,
        color: "#0284c7", // Blue
        icon: Layers,
    },
    {
        id: "safe-refactor",
        title: "Safe Refactor",
        steps: "Snapshot Tests → Refactor → Run Tests || Diff Check",
        type: "BUILT-IN",
        nodesCount: 3,
        color: "#10b981", // Emerald Green
        icon: ShieldCheck,
    },
];

const ProjectWorkflow = () => {
    const [workflows, setWorkflows] = useState(INITIAL_WORKFLOWS);
    const [filterCategory, setFilterCategory] = useState("all");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const builtInCount = workflows.filter((w) => w.type === "BUILT-IN").length;
    const customCount = workflows.filter((w) => w.type === "CUSTOM").length;

    const filteredWorkflows = workflows.filter((w) => {
        if (filterCategory === "builtin") return w.type === "BUILT-IN";
        if (filterCategory === "custom") return w.type === "CUSTOM";
        return true;
    });

    const handleCreateWorkflow = (newWorkflow) => {
        setWorkflows((prev) => [
            ...prev,
            {
                ...newWorkflow,
                id: `wf-${Date.now()}`,
                type: "CUSTOM",
                nodesCount: 1,
                steps: "Draft Workflow → Start Node",
                icon: Layers,
            },
        ]);
    };

    return (
        <div className="vibe-workflows-viewport">
            {/* Header / Thanh lọc trên cùng */}
            <div className="workflows-filter-control-bar">
                {/* 3 nút filter category */}
                <div className="filter-pill-switch-group">
                    <button
                        type="button"
                        className={`btn-filter-pill ${filterCategory === "all" ? "active" : ""}`}
                        onClick={() => setFilterCategory("all")}
                    >
                        All ({workflows.length})
                    </button>
                    <button
                        type="button"
                        className={`btn-filter-pill ${filterCategory === "builtin" ? "active" : ""}`}
                        onClick={() => setFilterCategory("builtin")}
                    >
                        Built-In ({builtInCount})
                    </button>
                    <button
                        type="button"
                        className={`btn-filter-pill ${filterCategory === "custom" ? "active" : ""}`}
                        onClick={() => setFilterCategory("custom")}
                    >
                        Custom ({customCount})
                    </button>
                </div>

                {/* Các nút action bên phải */}
                <div className="workflows-top-actions-cluster">
                    <button
                        type="button"
                        className="btn-new-workflow-black"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus size={15} />
                        <span>New Workflow</span>
                    </button>

                    <button type="button" className="btn-import-workflow-white">
                        <Upload size={14} />
                        <span>Import</span>
                    </button>
                </div>
            </div>

            {/* Lưới 3 cột Workflow Templates */}
            <div className="workflows-cards-grid">
                {filteredWorkflows.map((item) => {
                    const IconComponent = item.icon || Layers;

                    return (
                        <div key={item.id} className="workflow-card-surface">
                            {/* Dải line màu ở trên đỉnh đầu thẻ */}
                            <div
                                className="card-top-accent-line"
                                style={{ backgroundColor: item.color }}
                            />

                            {/* Khối Header thẻ: Icon, Title & nút ... */}
                            <div className="workflow-card-header-line">
                                <div className="workflow-card-identity">
                                    <div
                                        className="workflow-icon-well"
                                        style={{ color: item.color }}
                                    >
                                        <IconComponent size={18} />
                                    </div>
                                    <strong className="workflow-title-text">{item.title}</strong>
                                </div>

                                <button
                                    type="button"
                                    className="btn-card-more-menu"
                                    title="Options"
                                >
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>

                            {/* Mô tả các bước luồng thực thi */}
                            <p className="workflow-steps-flow-text">{item.steps}</p>

                            {/* Chân thẻ: Nhãn Built-in / Custom & số lượng node */}
                            <div className="workflow-card-bottom-meta">
                                <span className="workflow-type-tag">{item.type}</span>
                                <span className="workflow-node-count">{item.nodesCount} nodes</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Tạo Workflow mới */}
            <NewWorkflowModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateWorkflow}
            />
        </div>
    );
};

export default ProjectWorkflow;
