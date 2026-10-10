import { useState } from "react";
import {
    Folder,
    FileText,
    RefreshCw,
    MoreVertical,
    Upload,
    FolderSync,
    Download,
    ChevronsUpDown,
    Search,
    SplitSquareVertical,
    Play,
    Plus,
    Maximize2,
    RotateCw,
    MessageSquare,
    ChevronDown,
    Paperclip,
    Bot,
    Sparkles,
    Workflow,
    Sliders,
    EyeOff,
    SendHorizontal,
    GitBranch,
    Save,
    Server,
} from "lucide-react";
import "./WorkbenchWorkspace.css";

const CONVERSATIONS_MOCK = [
    { id: "c1", title: "Run Preview", time: "4d ago", tag: "active" },
    { id: "c2", title: "xxinchafo inquiry", time: "5d ago", tag: "active" },
    { id: "c3", title: "Greeting and Introduction", time: "5d ago", tag: "active" },
    { id: "c4", title: "AWS API config and model a...", time: "10/2/2026", tag: "active" },
    { id: "c5", title: "Run Preview", time: "10/1/2026", tag: "active" },
];

const WorkbenchWorkspace = ({ activeSubView = "ide" }) => {
    // Menu 3 chấm cột Files
    const [isFilesMenuOpen, setIsFilesMenuOpen] = useState(false);
    // Menu dropdown danh sách hội thoại
    const [isConvoListOpen, setIsConvoListOpen] = useState(false);
    // Menu nút dấu cộng (+) công cụ ở thanh prompt
    const [isToolsPopupOpen, setIsToolsPopupOpen] = useState(false);
    const [canvasSidebarTab, setCanvasSidebarTab] = useState("workflows"); // "workflows" | "agents"

    return (
        <div className="workbench-main-viewport">
            {/* ======================================================== */}
            {/* VIEW A: IDE (3 CỘT PILL CARD TÁCH RỜI)                   */}
            {/* ======================================================== */}
            {activeSubView === "ide" && (
                <div className="workbench-three-col-layout">
                    {/* CỘT 1: FILES EXPLORER */}
                    <div className="wb-column-files-pane">
                        <div className="wb-pane-header-row">
                            <div className="wb-pane-title-group">
                                <Folder size={14} />
                                <strong>Files</strong>
                                <button type="button" className="btn-icon-ghost" title="Refresh">
                                    <RefreshCw size={12} />
                                </button>
                            </div>

                            <div className="wb-header-right-controls">
                                <button type="button" className="btn-sync-to-folder-pill">
                                    <FolderSync size={12} />
                                    <span>Sync to folder</span>
                                </button>

                                <div className="wb-pane-more-relative">
                                    <button
                                        type="button"
                                        className="btn-icon-ghost"
                                        onClick={() => setIsFilesMenuOpen(!isFilesMenuOpen)}
                                    >
                                        <MoreVertical size={14} />
                                    </button>

                                    {isFilesMenuOpen && (
                                        <div className="wb-files-dropdown-menu">
                                            <div className="dropdown-menu-item">
                                                <Upload size={14} />
                                                <span>Upload file</span>
                                            </div>
                                            <div className="dropdown-menu-item with-caption">
                                                <div className="item-title-row">
                                                    <FolderSync size={14} />
                                                    <span>Sync to local folder</span>
                                                </div>
                                                <small>
                                                    This folder link is saved in this browser.
                                                    Clearing site data unlinks it — your files stay
                                                    safe on disk.
                                                </small>
                                            </div>
                                            <div className="dropdown-menu-item">
                                                <Download size={14} />
                                                <span>Download workspace</span>
                                            </div>
                                            <div className="dropdown-menu-divider" />
                                            <div className="dropdown-menu-item">
                                                <RefreshCw size={14} />
                                                <span>Refresh</span>
                                            </div>
                                            <div className="dropdown-menu-item">
                                                <ChevronsUpDown size={14} />
                                                <span>Expand all</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="wb-files-empty-stage">
                            <Folder size={32} className="glyph-empty-folder" />
                            <span>No files found</span>
                        </div>
                    </div>

                    {/* CỘT 2: EDITOR VIEWPORT */}
                    <div className="wb-column-editor-pane">
                        <div className="wb-pane-header-row">
                            <div className="wb-pane-title-group">
                                <SplitSquareVertical size={14} />
                                <span>No file open</span>
                            </div>
                            <div className="wb-header-right-controls">
                                <button type="button" className="btn-icon-ghost">
                                    <Search size={13} />
                                </button>
                                <button type="button" className="btn-icon-ghost">
                                    <SplitSquareVertical size={13} />
                                </button>
                            </div>
                        </div>
                        <div className="editor-sub-breadcrumb">Select a file to view</div>

                        <div className="wb-editor-empty-stage">
                            <FileText size={32} className="glyph-empty-file" />
                            <span>Select a file to view its contents</span>
                        </div>
                    </div>

                    {/* CỘT 3: CHAT & SANDBOX CONTROLS */}
                    <div className="wb-column-chat-pane">
                        <div className="wb-pane-header-row">
                            <div className="wb-convo-selector-wrap">
                                <button
                                    type="button"
                                    className="btn-convo-dropdown"
                                    onClick={() => setIsConvoListOpen(!isConvoListOpen)}
                                >
                                    <MessageSquare size={13} />
                                    <span>New conversation</span>
                                </button>

                                {isConvoListOpen && (
                                    <div className="wb-convo-flyout-card">
                                        <div className="convo-flyout-header">
                                            <button type="button" className="btn-create-convo-link">
                                                <Plus size={13} />
                                                <span>New Conversation</span>
                                            </button>
                                        </div>
                                        <div className="convo-flyout-title-line">
                                            <strong>Conversations</strong>
                                            <span>5</span>
                                        </div>
                                        <div className="convo-flyout-filters">
                                            <span className="active-pill">Active</span>
                                            <span>Archived</span>
                                            <span>All</span>
                                        </div>
                                        <div className="convo-flyout-list-items">
                                            {CONVERSATIONS_MOCK.map((c) => (
                                                <div key={c.id} className="convo-item-row">
                                                    <span className="dot-status green" />
                                                    <div className="convo-meta-col">
                                                        <strong>{c.title}</strong>
                                                        <small>{c.time}</small>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="wb-header-right-controls">
                                <button type="button" className="btn-icon-ghost">
                                    <Maximize2 size={13} />
                                </button>
                                <button type="button" className="btn-icon-ghost">
                                    <RotateCw size={13} />
                                </button>
                            </div>
                        </div>

                        {/* Vùng chào mừng Start Sandbox */}
                        <div className="wb-chat-middle-content">
                            <div className="start-sandbox-banner-card">
                                <div className="sandbox-logo-pill">
                                    <span className="logo-sparkle-dots">•••</span>
                                </div>
                                <h3>Start a sandbox to begin</h3>
                                <p>
                                    Spin up an isolated coding environment — your repo, models and
                                    tools, ready to go. Then just start chatting.
                                </p>
                                <button type="button" className="btn-start-sandbox-solid">
                                    <Play size={13} fill="currentColor" />
                                    <span>Start Sandbox →</span>
                                </button>
                                <small className="sandbox-idle-note">
                                    Auto-stops after 1h idle · your workspace is saved automatically
                                    in the cloud
                                </small>
                            </div>
                        </div>

                        {/* Thanh Prompt Input dưới đáy */}
                        <div className="wb-chat-prompt-footer">
                            <div className="prompt-input-surface-box">
                                <span className="prompt-stopped-hint">
                                    Sandbox stopped — click Start to continue
                                </span>

                                <div className="prompt-bottom-controls-bar">
                                    <div className="prompt-left-tools-wrap">
                                        <button
                                            type="button"
                                            className="btn-plus-tool-circle"
                                            onClick={() => setIsToolsPopupOpen(!isToolsPopupOpen)}
                                        >
                                            <Plus size={15} />
                                        </button>

                                        {/* Popup công cụ mở rộng */}
                                        {isToolsPopupOpen && (
                                            <div className="prompt-tools-popup-menu">
                                                <div className="tool-menu-row">
                                                    <Paperclip size={14} />
                                                    <span>Add files or photos</span>
                                                    <kbd>Ctrl+Shift+A</kbd>
                                                </div>
                                                <div className="tool-menu-row">
                                                    <Bot size={14} />
                                                    <span>Agent</span>
                                                    <span className="tool-menu-val">None</span>
                                                </div>
                                                <div className="tool-menu-row">
                                                    <Sparkles size={14} />
                                                    <span>Skill</span>
                                                    <span className="tool-menu-val">Auto</span>
                                                </div>
                                                <div className="tool-menu-row">
                                                    <Workflow size={14} />
                                                    <span>Workflow</span>
                                                    <span className="tool-menu-val">None</span>
                                                </div>
                                                <div className="tool-menu-divider" />
                                                <div className="tool-menu-row">
                                                    <Sliders size={14} />
                                                    <span>Auto Approve</span>
                                                    <span className="tool-menu-val">OFF</span>
                                                </div>
                                                <div className="tool-menu-row">
                                                    <EyeOff size={14} />
                                                    <span>Hide Thinking</span>
                                                    <span className="tool-menu-val">OFF</span>
                                                </div>
                                                <div className="tool-menu-row">
                                                    <Download size={14} />
                                                    <span>Download transcript (.md)</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="prompt-right-tools-wrap">
                                        <button type="button" className="btn-select-model-link">
                                            <span>Select model</span>
                                            <ChevronDown size={12} />
                                        </button>
                                        <button type="button" className="btn-send-message-disabled">
                                            <SendHorizontal size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <small className="ai-disclaimer-text">
                                • Offline · AI can make mistakes. Review the results carefully.
                            </small>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW B: CANVAS (WORKFLOW NODE DESIGNER)                  */}
            {/* ======================================================== */}
            {activeSubView === "canvas" && (
                <div className="workbench-canvas-layout">
                    {/* Panel bên trái: Workflows & Agents Picker */}
                    <div className="canvas-left-picker-pane">
                        <div className="canvas-picker-tabs-row">
                            <button
                                type="button"
                                className={`btn-canvas-subtab ${canvasSidebarTab === "workflows" ? "active" : ""}`}
                                onClick={() => setCanvasSidebarTab("workflows")}
                            >
                                WORKFLOWS
                            </button>
                            <button
                                type="button"
                                className={`btn-canvas-subtab ${canvasSidebarTab === "agents" ? "active" : ""}`}
                                onClick={() => setCanvasSidebarTab("agents")}
                            >
                                AGENTS
                            </button>
                        </div>

                        <div className="canvas-picker-search">
                            <Search size={13} />
                            <input type="text" placeholder="Filter..." />
                        </div>

                        <div className="canvas-picker-items-list">
                            {canvasSidebarTab === "workflows" ? (
                                <>
                                    <div className="canvas-item-entry active">
                                        <span className="indicator-line cyan" />
                                        <span>RFP to Demo</span>
                                    </div>
                                    <div className="canvas-item-entry">
                                        <span className="indicator-line indigo" />
                                        <span>RFP to Proposal</span>
                                    </div>
                                    <div className="canvas-item-entry">
                                        <span className="indicator-line red" />
                                        <span>Bug Fix Pipeline</span>
                                    </div>
                                    <div className="canvas-item-entry">
                                        <span className="indicator-line amber" />
                                        <span>Code Review Pipeline</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="canvas-item-entry">
                                        <span className="indicator-line blue" />
                                        <span>Business Analyst</span>
                                    </div>
                                    <div className="canvas-item-entry">
                                        <span className="indicator-line emerald" />
                                        <span>Project Manager</span>
                                    </div>
                                    <div className="canvas-item-entry">
                                        <span className="indicator-line purple" />
                                        <span>Solution Architect</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Vùng Vẽ Node Canvas */}
                    <div className="canvas-graph-main-pane">
                        <div className="canvas-graph-top-actions">
                            <span className="canvas-status-tag">
                                Ready <strong>Start sandbox to run</strong> · 07:59 PM
                            </span>
                            <div className="canvas-top-btn-cluster">
                                <button type="button" className="btn-canvas-save">
                                    <Save size={13} />
                                    <span>Save</span>
                                </button>
                                <button type="button" className="btn-canvas-save-tpl">
                                    <span>Save as Template</span>
                                </button>
                                <button type="button" className="btn-canvas-start-sb">
                                    <Play size={12} fill="currentColor" />
                                    <span>Start Sandbox</span>
                                </button>
                            </div>
                        </div>

                        {/* Luồng 3 Nodes kết nối */}
                        <div className="canvas-nodes-flow-container">
                            {/* Node 1: Analyze Bug */}
                            <div className="canvas-node-card">
                                <div className="node-port port-in">IN ↓</div>
                                <div className="node-header-row">
                                    <div className="node-title-group">
                                        <Bot size={16} />
                                        <strong>Analyze Bug</strong>
                                    </div>
                                    <span className="node-role-badge">ARCHITECT</span>
                                </div>
                                <p className="node-body-snippet">
                                    ## Step 0: AGENT.md Setup Before starting, check if `AGENT.md`
                                    exists at the project root...
                                </p>
                                <div className="node-port port-out">OUT ↓</div>
                            </div>

                            <div className="node-flow-connector-line" />

                            {/* Node 2: Implement Fix */}
                            <div className="canvas-node-card">
                                <div className="node-port port-in">IN ↓</div>
                                <div className="node-header-row">
                                    <div className="node-title-group">
                                        <Server size={16} />
                                        <strong>Implement Fix</strong>
                                    </div>
                                    <span className="node-role-badge">BACKEND</span>
                                </div>
                                <p className="node-body-snippet">
                                    Based on the analysis from the previous step, implement the fix
                                    for &apos;Main&apos; on branch &apos;main&apos;...
                                </p>
                                <div className="node-port port-out">OUT ↓</div>
                            </div>

                            <div className="node-flow-connector-line" />

                            {/* Node 3: Verify (parallel) */}
                            <div className="canvas-node-card">
                                <div className="node-port port-in">IN ↓</div>
                                <div className="node-header-row">
                                    <div className="node-title-group">
                                        <GitBranch size={16} />
                                        <strong>Verify (parallel)</strong>
                                    </div>
                                    <span className="node-role-badge">PARALLEL</span>
                                </div>
                                <div className="node-parallel-agents-tags">
                                    <span>BACKEND</span>
                                    <span>REVIEWER</span>
                                </div>
                                <p className="node-body-snippet">
                                    After all subagents finish, consolidate their results into one
                                    combined report...
                                </p>
                                <div className="node-port port-out">OUT ↓</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkbenchWorkspace;
