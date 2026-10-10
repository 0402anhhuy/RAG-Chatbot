import { useState } from "react";
import {
    Plus,
    FileText,
    Tv,
    FolderKanban,
    Cpu,
    Database,
    ShieldAlert,
    FileCode,
    GitFork,
    FileDiff,
    CheckCircle2,
    Server,
    History,
    Cloud,
    Layout,
    TestTube2,
    Shield,
} from "lucide-react";
import CreateAgentModal from "../../components/modals/agents/CreateAgentModal";
import "./ProjectAgent.css";

const INITIAL_AGENTS = [
    {
        id: "business-analyst",
        name: "business-analyst",
        desc: "Business Analyst - Cross-industry requirements, SRS, user stories, process modeling",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#3b82f6", // Blue
        icon: FileText,
    },
    {
        id: "slide-craft",
        name: "slide-craft",
        desc: "Presentation Designer — generates self-contained 16:9 slide decks (HTML + PDF + PPTX) from documents, RFPs, or topics",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#ec4899", // Pink
        icon: Tv,
    },
    {
        id: "project-manager",
        name: "project-manager",
        desc: "Project Manager - Planning, WBS, timeline, risk management, sprint planning",
        type: "BUILT-IN",
        permission: "Docs writer",
        color: "#10b981", // Emerald
        icon: FolderKanban,
    },
    {
        id: "solution-architect",
        name: "solution-architect",
        desc: "Solution Architect - System design, data architecture, infrastructure planning, and ADR",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#8b5cf6", // Purple
        icon: Cpu,
    },
    {
        id: "dba-expert",
        name: "dba-expert",
        desc: "DBA Expert - Query tuning, schema design, replication, all database engines",
        type: "BUILT-IN",
        permission: "Docs writer",
        color: "#ec4899", // Pink
        icon: Database,
    },
    {
        id: "security-auditor",
        name: "security-auditor",
        desc: "Security Auditor - White-box security code review (OWASP Top 10 Web + API, CWE, CVSS): finds vulnerabilities with exact file:line, exploit scenario, and a working fix, then writes a report t...",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#ef4444", // Red
        icon: ShieldAlert,
    },
    {
        id: "document-to-md",
        name: "document-to-md",
        desc: "Convert source documents (PDF, Word, Excel, PowerPoint) to Markdown using the matching skill (pdf/docx/xlsx/pptx), with selective diagram/figure rasterization to PNG, and save to...",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#ef4444", // Red
        icon: FileCode,
    },
    {
        id: "migration-expert",
        name: "migration-expert",
        desc: "Migration Expert - System, code, data, and platform migration strategies",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#f97316", // Orange
        icon: GitFork,
    },
    {
        id: "docs-drift",
        name: "docs-drift",
        desc: "Docs Drift Auditor — audits the docs against the code and fixes stale references (renamed symbols, moved files, dead links, outdated commands), report-first",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#0ea5e9", // Sky
        icon: FileDiff,
    },
    {
        id: "reviewer",
        name: "reviewer",
        desc: "Reviewer - Code review (all stacks) and document review (SRS, RFP, design docs)",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#ef4444", // Red
        icon: CheckCircle2,
    },
    {
        id: "backend-dev",
        name: "backend-dev",
        desc: "Backend Developer - Implements APIs and business logic across all backend stacks",
        type: "BUILT-IN",
        permission: "Full access",
        color: "#f59e0b", // Amber
        icon: Server,
    },
    {
        id: "revert-expert",
        name: "revert-expert",
        desc: "Reverse Engineering Expert - Legacy code analysis, documentation extraction, and modernization strategy",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#8b5cf6", // Purple
        icon: History,
    },
    {
        id: "cloud-expert",
        name: "cloud-expert",
        desc: "Cloud Expert - AWS, Azure, GCP, Alibaba Cloud, OCI, Kubernetes, Terraform",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#06b6d4", // Teal
        icon: Cloud,
    },
    {
        id: "frontend-dev",
        name: "frontend-dev",
        desc: "Frontend Developer - Implements UI components and features across all frontend stacks",
        type: "BUILT-IN",
        permission: "Full access",
        color: "#10b981", // Emerald
        icon: Layout,
    },
    {
        id: "tester",
        name: "tester",
        desc: "Tester - Write test cases (IPA standard or your template) and execute them against a running web app (Playwright), reporting pass/fail per TC-ID",
        type: "BUILT-IN",
        permission: "Scoped edits",
        color: "#84cc16", // Lime
        icon: TestTube2,
    },
];

const ProjectAgent = () => {
    const [agents, setAgents] = useState(INITIAL_AGENTS);
    const [filterCategory, setFilterCategory] = useState("all");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const builtInCount = agents.filter((a) => a.type === "BUILT-IN").length;
    const customCount = agents.filter((a) => a.type === "CUSTOM").length;

    const filteredAgents = agents.filter((a) => {
        if (filterCategory === "builtin") return a.type === "BUILT-IN";
        if (filterCategory === "custom") return a.type === "CUSTOM";
        return true;
    });

    const handleCreateAgent = (newAgentData) => {
        setAgents((prev) => [
            ...prev,
            {
                ...newAgentData,
                id: `agent-${Date.now()}`,
                type: "CUSTOM",
                icon: Cpu,
            },
        ]);
    };

    return (
        <div className="vibe-agents-viewport">
            {/* Header Filter Control Bar */}
            <div className="agents-filter-control-bar">
                <div className="filter-pill-switch-group">
                    <button
                        type="button"
                        className={`btn-filter-pill ${filterCategory === "all" ? "active" : ""}`}
                        onClick={() => setFilterCategory("all")}
                    >
                        All ({agents.length})
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

                <button
                    type="button"
                    className="btn-new-agent-black"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={15} />
                    <span>New Agent</span>
                </button>
            </div>

            {/* Lưới 3 cột Agents */}
            <div className="agents-cards-grid">
                {filteredAgents.map((agent) => {
                    const IconComp = agent.icon || Cpu;

                    return (
                        <div key={agent.id} className="agent-card-surface">
                            {/* Dải line màu ở đỉnh đầu thẻ */}
                            <div
                                className="agent-card-top-line"
                                style={{ backgroundColor: agent.color }}
                            />

                            {/* Header Thẻ: Icon + Tên Agent */}
                            <div className="agent-card-identity">
                                <div className="agent-icon-well" style={{ color: agent.color }}>
                                    <IconComp size={16} />
                                </div>
                                <strong className="agent-name-text">{agent.name}</strong>
                            </div>

                            {/* Mô tả nhiệm vụ */}
                            <p className="agent-desc-text">{agent.desc}</p>

                            {/* Chân Thẻ: Badge Built-in & Quyền hạn */}
                            <div className="agent-card-footer">
                                <span className="agent-badge-type">{agent.type}</span>
                                <div className="agent-permission-tag">
                                    <Shield size={11} className="perm-shield-icon" />
                                    <span>{agent.permission}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Create Agent */}
            <CreateAgentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateAgent}
            />
        </div>
    );
};

export default ProjectAgent;
