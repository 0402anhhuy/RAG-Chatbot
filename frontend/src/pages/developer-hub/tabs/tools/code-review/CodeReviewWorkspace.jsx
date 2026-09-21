import { useState, useRef, useEffect } from "react";
import {
    AlertCircle,
    ArrowLeft,
    Bot,
    ChevronDown,
    ChevronRight,
    Columns,
    CornerDownLeft,
    FileCode2,
    FilePlus,
    FileText,
    Filter,
    Folder,
    FolderPlus,
    GitBranch,
    GitCommit,
    History,
    Maximize2,
    Mic,
    Minus,
    MoreHorizontal,
    PanelRightClose,
    Play,
    Plus,
    Radio,
    RefreshCw,
    Search,
    Send,
    Settings,
    Shield,
    SlidersHorizontal,
    Sparkles,
    Terminal,
    Wand2,
    X,
    XCircle,
} from "lucide-react";
import "./CodeReviewWorkspace.css";

const INITIAL_TREE = [
    { id: "github", name: ".github", type: "folder", isOpen: false, children: [] },
    { id: "venv", name: ".venv", type: "folder", isOpen: false, children: [] },
    { id: "vscode", name: ".vscode", type: "folder", isOpen: false, children: [] },
    { id: "backend", name: "backend", type: "folder", isOpen: false, badge: "•", children: [] },
    {
        id: "frontend",
        name: "frontend",
        type: "folder",
        isOpen: true,
        children: [
            {
                id: "src",
                name: "src",
                type: "folder",
                isOpen: true,
                children: [
                    {
                        id: "components",
                        name: "components",
                        type: "folder",
                        isOpen: true,
                        children: [
                            {
                                id: "logo",
                                name: "logo",
                                type: "folder",
                                isOpen: true,
                                children: [
                                    {
                                        id: "BrandLogo.css",
                                        name: "BrandLogo.css",
                                        type: "file",
                                        status: "U",
                                    },
                                    {
                                        id: "BrandLogo.jsx",
                                        name: "BrandLogo.jsx",
                                        type: "file",
                                        status: "U",
                                    },
                                ],
                            },
                            {
                                id: "CodeReviewWorkspace.css",
                                name: "CodeReviewWorkspace.css",
                                type: "file",
                                status: "M",
                            },
                        ],
                    },
                ],
            },
        ],
    },
];

const CODE_LINES = [
    { num: 11, code: ".brand-mark-stripes {" },
    { num: 12, code: "    display: inline-flex;" },
    { num: 13, code: "    align-items: center;" },
    { num: 14, code: "    gap: 3px;" },
    { num: 15, code: "    height: 18px;" },
    { num: 16, code: "}" },
    { num: 17, code: "" },
    { num: 18, code: ".brand-mark-stripes i {" },
    { num: 19, code: "    width: 3px;" },
    { num: 20, code: "    height: 15px;" },
    { num: 21, code: "    display: block;" },
    { num: 22, code: "    border-radius: 2px;" },
    { num: 23, code: "    transform: skewX(-20deg);" },
    { num: 24, code: "}" },
    { num: 25, code: "" },
    { num: 26, code: "/* Bộ màu mới: Violet - Cyan - Mint */", isComment: true },
    { num: 27, code: ".brand-mark-stripes i:nth-child(1) {" },
    { num: 28, code: "    background: #8b5cf6;", isHighlighted: true, colorDot: "#8b5cf6" },
    { num: 29, code: "}" },
    { num: 30, code: "" },
    { num: 31, code: ".brand-mark-stripes i:nth-child(2) {" },
    { num: 32, code: "    height: 20px;" },
    { num: 33, code: "    background: #06b6d4;", colorDot: "#06b6d4" },
    { num: 34, code: "}" },
    { num: 35, code: "" },
    { num: 36, code: ".brand-mark-stripes i:nth-child(3) {" },
    { num: 37, code: "    background: #10b981;", colorDot: "#10b981" },
    { num: 38, code: "}" },
];

const CHAT_SESSIONS = [
    { id: 1, title: "prettierrc", status: "Failed", isError: true, time: "5 days ago" },
    {
        id: 2,
        title: "Thiết kế lại trang chat user",
        status: "Failed",
        isError: true,
        diff: "+0 -24",
        time: "2 wks ago",
    },
    {
        id: 3,
        title: "Tổng hợp câu hỏi từ pdfs",
        status: "Clean",
        isError: false,
        time: "4 mos ago",
    },
];

const OPEN_TABS = [
    { name: "Layout.jsx", type: "jsx", status: "U" },
    { name: "AdminDashboard.css", type: "css" },
    { name: "BrandLogo.css", type: "css", status: "U", active: true },
    { name: "CodeReviewWorkspace.css", type: "css", status: "M" },
];

const CodeReviewWorkspace = ({ onBackToHub }) => {
    const [tree, setTree] = useState(INITIAL_TREE);
    const [activeTabName, setActiveTabName] = useState("BrandLogo.css");
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(true); // Trạng thái mở khung chat Agent
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false); // Menu 3 chấm ở header tab
    const [chatPrompt, setChatPrompt] = useState("");
    const menuRef = useRef(null);

    // Bắt sự kiện click outside để đóng dropdown menu 3 chấm
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsHeaderMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleFolder = (nodeId, nodes = tree) => {
        return nodes.map((node) => {
            if (node.id === nodeId) return { ...node, isOpen: !node.isOpen };
            if (node.children) return { ...node, children: toggleFolder(nodeId, node.children) };
            return node;
        });
    };

    const renderTreeNodes = (nodes, depth = 0) => {
        return nodes.map((node) => {
            const paddingLeft = `${depth * 14 + 10}px`;
            if (node.type === "folder") {
                return (
                    <div key={node.id} className="tree-folder-block">
                        <div
                            className="tree-row folder-row"
                            style={{ paddingLeft }}
                            onClick={() => setTree((prev) => toggleFolder(node.id, prev))}
                        >
                            <span className="folder-chevron">
                                {node.isOpen ? (
                                    <ChevronDown size={13} />
                                ) : (
                                    <ChevronRight size={13} />
                                )}
                            </span>
                            <Folder size={13} className="node-folder-icon" />
                            <span className="node-name">{node.name}</span>
                        </div>
                        {node.isOpen && node.children && renderTreeNodes(node.children, depth + 1)}
                    </div>
                );
            }
            const isSelected = activeTabName === node.name;
            return (
                <div
                    key={node.id}
                    className={`tree-row file-row ${isSelected ? "selected" : ""}`}
                    style={{ paddingLeft: `${depth * 14 + 24}px` }}
                    onClick={() => setActiveTabName(node.name)}
                >
                    <FileCode2
                        size={13}
                        className={`file-glyph ${node.name.endsWith(".css") ? "css" : "jsx"}`}
                    />
                    <span className="node-name">{node.name}</span>
                    {node.status && (
                        <span className={`git-status-badge ${node.status}`}>{node.status}</span>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="vscode-editor-root">
            {/* 1. SIDEBAR EXPLORER */}
            <aside className="vscode-sidebar">
                <div className="vscode-sidebar-titlebar">
                    <button
                        type="button"
                        className="btn-return-hub"
                        onClick={onBackToHub}
                        title="Back to Tools"
                    >
                        <ArrowLeft size={13} />
                    </button>
                    <span className="titlebar-heading">EXPLORER</span>
                    <button type="button" className="sidebar-action-dots">
                        <MoreHorizontal size={14} />
                    </button>
                </div>

                <div className="vscode-explorer-body">
                    <div className="explorer-repo-header">
                        <div className="repo-toggle-wrap">
                            <ChevronDown size={14} />
                            <strong>RAG_CHATBOT</strong>
                        </div>
                        <div className="repo-quick-icons">
                            <FilePlus size={13} title="New File" />
                            <FolderPlus size={13} title="New Folder" />
                            <RefreshCw size={13} title="Refresh" />
                            <Minus size={13} title="Collapse" />
                        </div>
                    </div>
                    <div className="vscode-tree-container">{renderTreeNodes(tree)}</div>
                </div>
            </aside>

            {/* 2. EDITOR CHÍNH */}
            <main className="vscode-main-area">
                {/* Tabs Bar với các actions */}
                <div className="vscode-tabs-bar">
                    <div className="tabs-scroller-track">
                        {OPEN_TABS.map((tab) => {
                            const isActive = activeTabName === tab.name;
                            return (
                                <div
                                    key={tab.name}
                                    className={`editor-tab-item ${isActive ? "active" : ""}`}
                                    onClick={() => setActiveTabName(tab.name)}
                                >
                                    <FileCode2 size={13} className={`tab-file-icon ${tab.type}`} />
                                    <span className="tab-title-text">{tab.name}</span>
                                    {tab.status && (
                                        <span className={`tab-git-tag ${tab.status}`}>
                                            {tab.status}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="tab-close-btn"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* CỤM NÚT CÔNG CỤ TRÊN HEADER */}
                    <div className="tabs-toolbar-actions" ref={menuRef}>
                        <button type="button" className="action-btn-glyph" title="Run Code">
                            <Play size={15} />
                        </button>
                        <button type="button" className="action-btn-glyph" title="File History">
                            <History size={15} />
                        </button>
                        <button type="button" className="action-btn-glyph" title="Sync Changes">
                            <RefreshCw size={14} />
                        </button>

                        <button
                            type="button"
                            className={`action-btn-glyph ${isChatPanelOpen ? "active" : ""}`}
                            onClick={() => setIsChatPanelOpen((prev) => !prev)}
                            title="Toggle Copilot Chat"
                        >
                            <Columns size={15} />
                        </button>

                        <button
                            type="button"
                            className={`action-btn-glyph ${isHeaderMenuOpen ? "active" : ""}`}
                            onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                            title="More Actions"
                        >
                            <MoreHorizontal size={15} />
                        </button>

                        {/* DROPDOWN MENU ẢNH 1 */}
                        {isHeaderMenuOpen && (
                            <div className="editor-dropdown-context-menu">
                                <div className="menu-action-item">Stage Changes</div>
                                <div className="menu-action-item">Show Opened Editors</div>
                                <div className="menu-divider-line" />
                                <div className="menu-action-item">
                                    <span>Close All</span>
                                    <kbd>Ctrl+K W</kbd>
                                </div>
                                <div className="menu-action-item">
                                    <span>Close Saved</span>
                                    <kbd>Ctrl+K U</kbd>
                                </div>
                                <div className="menu-divider-line" />
                                <div className="menu-action-item checked">
                                    <span className="check-mark">✓</span>
                                    <span>Enable Preview Editors</span>
                                </div>
                                <div className="menu-action-item">Lock Group</div>
                                <div className="menu-divider-line" />
                                <div className="menu-action-item">Configure Editors</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="vscode-breadcrumbs-bar">
                    <span>frontend</span>
                    <span className="sep">&gt;</span>
                    <span>src</span>
                    <span className="sep">&gt;</span>
                    <span>components</span>
                    <span className="sep">&gt;</span>
                    <FileCode2 size={12} className="crumb-file-icon" />
                    <strong>{activeTabName}</strong>
                </div>

                {/* Code Canvas */}
                <div className="vscode-editor-canvas">
                    <div className="code-text-scroller">
                        {CODE_LINES.map((line) => (
                            <div
                                key={line.num}
                                className={`code-gutter-row ${line.isHighlighted ? "active-line-highlight" : ""}`}
                            >
                                <span className="gutter-num">{line.num}</span>
                                <div className="code-line-prose">
                                    {line.colorDot && (
                                        <span
                                            className="inline-color-chip"
                                            style={{ backgroundColor: line.colorDot }}
                                        />
                                    )}
                                    <span
                                        className={`code-syntax ${line.isComment ? "comment-text" : ""}`}
                                    >
                                        {line.code}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Minimap */}
                    <div className="vscode-minimap-rail">
                        <div className="minimap-viewport-slider" />
                        <div className="minimap-lines-sim">
                            {CODE_LINES.map((_, idx) => (
                                <div key={idx} className="minimap-pixel-line" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status bar */}
                <footer className="vscode-statusbar">
                    <div className="statusbar-left-cluster">
                        <div className="status-item git-branch">
                            <GitBranch size={11} />
                            <span>main*</span>
                        </div>
                        <div className="status-item">
                            <AlertCircle size={11} />
                            <span>0 ⚠ 0</span>
                        </div>
                        <div className="status-item">
                            <GitCommit size={11} />
                            <span>Git Graph</span>
                        </div>
                    </div>
                    <div className="statusbar-right-cluster">
                        <div className="status-item">Ln 28, Col 25</div>
                        <div className="status-item">UTF-8</div>
                        <div className="status-item lang-badge">{} CSS</div>
                        <div className="status-item quota-alert-badge">
                            <Radio size={11} />
                            <span>Quota reached</span>
                        </div>
                    </div>
                </footer>
            </main>

            {/* 3. COPILOT / AGENT CHAT PANEL BÊN PHẢI (THEO ẢNH 2 - THEME SÁNG) */}
            {isChatPanelOpen && (
                <aside className="agent-chat-sidepanel">
                    {/* Chat Panel Header */}
                    <div className="agent-panel-header">
                        <div className="header-badge-pill">
                            <span>Chat</span>
                        </div>
                        <div className="header-controls-cluster">
                            <button type="button" className="agent-header-btn" title="New Session">
                                <Plus size={14} />
                            </button>
                            <button
                                type="button"
                                className="agent-header-btn"
                                title="Model Settings"
                            >
                                <Settings size={14} />
                            </button>
                            <button type="button" className="agent-header-btn" title="More">
                                <MoreHorizontal size={14} />
                            </button>
                            <span className="control-divider">|</span>
                            <button type="button" className="agent-header-btn" title="Maximize">
                                <Maximize2 size={13} />
                            </button>
                            <button
                                type="button"
                                className="agent-header-btn"
                                onClick={() => setIsChatPanelOpen(false)}
                                title="Close Chat"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Sessions List */}
                    <div className="agent-sessions-section">
                        <div className="sessions-title-bar">
                            <strong>Sessions</strong>
                            <div className="sessions-tools">
                                <RefreshCw size={12} className="tool-icon" title="Refresh" />
                                <Search size={12} className="tool-icon" title="Search sessions" />
                                <Filter size={12} className="tool-icon" title="Filter" />
                                <Columns size={12} className="tool-icon" title="Layout" />
                            </div>
                        </div>

                        <div className="sessions-history-list">
                            {CHAT_SESSIONS.map((s) => (
                                <div key={s.id} className="session-history-item">
                                    <div className="session-lead-col">
                                        {s.isError ? (
                                            <XCircle
                                                size={14}
                                                className="session-status-glyph error"
                                            />
                                        ) : (
                                            <span className="session-clean-dot" />
                                        )}
                                        <div className="session-titles-wrap">
                                            <strong className="session-title-text">
                                                {s.title}
                                            </strong>
                                            <div className="session-metrics-line">
                                                {s.diff && (
                                                    <span className="diff-green-red">
                                                        {s.diff} ·{" "}
                                                    </span>
                                                )}
                                                <span className={s.isError ? "text-failed" : ""}>
                                                    {s.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="session-time-text">{s.time}</span>
                                </div>
                            ))}
                        </div>

                        <div className="sessions-more-row">
                            <span>More</span>
                            <span className="more-count-pill">4</span>
                        </div>
                    </div>

                    {/* Chat Messages / Prompt Composer Area */}
                    <div className="agent-composer-dock">
                        <div className="composer-surface-card">
                            {/* Selected Context File Pill */}
                            <div className="context-attachment-pill">
                                <Plus size={11} className="plus-glyph" />
                                <FileCode2 size={12} className="css-file-glyph" />
                                <span>CodeReviewWorkspace.css</span>
                            </div>

                            {/* Text Input */}
                            <textarea
                                className="composer-textarea"
                                rows={3}
                                placeholder="Describe what to build"
                                value={chatPrompt}
                                onChange={(e) => setChatPrompt(e.target.value)}
                            />

                            {/* Action Tools Row */}
                            <div className="composer-footer-toolbar">
                                <div className="toolbar-left-tools">
                                    <button type="button" className="tool-pill-action">
                                        <Plus size={12} />
                                    </button>
                                    <button type="button" className="tool-pill-action labeled">
                                        <Bot size={13} color="#0284c7" />
                                        <span>Agent</span>
                                    </button>
                                    <button type="button" className="tool-pill-action labeled">
                                        <Wand2 size={13} color="#8b5cf6" />
                                        <span>Auto</span>
                                    </button>
                                    <button type="button" className="tool-pill-action labeled">
                                        <span>Balance</span>
                                        <SlidersHorizontal size={11} />
                                    </button>
                                </div>

                                <div className="toolbar-right-tools">
                                    <button
                                        type="button"
                                        className="tool-glyph-btn"
                                        title="Voice Dictation"
                                    >
                                        <Mic size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!chatPrompt.trim()}
                                        className="tool-send-btn"
                                        title="Submit Prompt"
                                    >
                                        <CornerDownLeft size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Environment Guardrails */}
                        <div className="composer-env-footer">
                            <div className="env-item">
                                <Terminal size={12} />
                                <span>Local</span>
                            </div>
                            <div className="env-item">
                                <Shield size={12} />
                                <span>Default permissions</span>
                            </div>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
};

export default CodeReviewWorkspace;
