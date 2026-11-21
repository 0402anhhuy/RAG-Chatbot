import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Folder,
    FileText,
    RefreshCw,
    MoreVertical,
    Upload,
    FolderSync,
    Download,
    ChevronsUpDown,
    ChevronsDownUp,
    Search,
    SplitSquareVertical,
    Plus,
    Maximize2,
    RotateCw,
    MessageSquare,
    Paperclip,
    Bot,
    Sparkles,
    Workflow,
    Sliders,
    EyeOff,
    SendHorizontal,
    Save,
    Loader2,
    Trash2,
    Server,
    GitBranch,
} from "lucide-react";
import { agentApi, chatApi, workflowApi, workbenchApi } from "../../../../../../api";

// Workbench nằm ở tabs/projects/tabs/workbench nên cần 5 cấp "../" để về src.
import CustomSelector from "../../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../../context/ToastContext";
import WorkbenchFileTree from "./components/WorkbenchFileTree";
import {
    buildFileTree,
    collectExtensions,
    collectFolderPaths,
    extensionOfPath,
    formatBytes,
    languageOfPath,
} from "./helpers/fileTree";
import { buildTranscriptMarkdown, downloadTextFile } from "./helpers/transcript";
import "./WorkbenchWorkspace.css";

const CONVO_FILTERS = [
    { value: "ACTIVE", label: "Active" },
    { value: "ARCHIVED", label: "Archived" },
    { value: "ALL", label: "All" },
];

const SKILL_OPTIONS = [
    { value: "Auto", label: "Auto" },
    { value: "Manual", label: "Manual" },
];

const PLACEHOLDER_FILE = `// src/hello.js
export const hello = (name) => \`Hello, \${name}!\`;
`;

const getSessionUser = () => {
    try {
        const raw = localStorage.getItem("rag_session");
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed?.user || parsed || {};
    } catch {
        return {};
    }
};

const formatRelative = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 60 * 24) return `${Math.round(diffMinutes / 60)}h ago`;
    if (diffMinutes < 60 * 24 * 7) return `${Math.round(diffMinutes / (60 * 24))}d ago`;
    return date.toLocaleDateString();
};

const downloadBlob = (blob, filename) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const WorkbenchWorkspace = ({
    project = null,
    activeSubView = "ide",
    conversation = null,
    onOpenConversation,
}) => {
    const projectId = project?.id || null;
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    // ---------------------------------------------------------------- files
    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [fileSearch, setFileSearch] = useState("");
    const [extensionFilter, setExtensionFilter] = useState("all");
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [isFilesMenuOpen, setIsFilesMenuOpen] = useState(false);
    const [isCreateFileOpen, setIsCreateFileOpen] = useState(false);
    const [newFilePath, setNewFilePath] = useState("");
    const [creatingFile, setCreatingFile] = useState(false);

    // --------------------------------------------------------------- editor
    const [activeFile, setActiveFile] = useState(null);
    const [draft, setDraft] = useState("");
    const [savingFile, setSavingFile] = useState(false);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    // ----------------------------------------------------------- conversations
    const [conversations, setConversations] = useState([]);
    const [convoFilter, setConvoFilter] = useState("ACTIVE");
    const [isConvoListOpen, setIsConvoListOpen] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState(conversation?.id || null);
    const [messages, setMessages] = useState([]);
    const [creatingConvo, setCreatingConvo] = useState(false);

    // -------------------------------------------------------------- settings
    const [settings, setSettings] = useState(null);
    const [isToolsPopupOpen, setIsToolsPopupOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [sending, setSending] = useState(false);
    const [canvasSidebarTab, setCanvasSidebarTab] = useState("workflows");
    const [workflows, setWorkflows] = useState([]);
    const [agents, setAgents] = useState([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

    const activeConversation =
        conversations.find((item) => item.id === activeConversationId) || null;
    const tree = useMemo(() => buildFileTree(files), [files]);
    const extensionOptions = useMemo(
        () => [
            { value: "all", label: "All types" },
            ...collectExtensions(files).map((ext) => ({ value: ext, label: `.${ext}` })),
        ],
        [files],
    );

    const isDirty = activeFile ? draft !== (activeFile.content ?? "") : false;

    // ------------------------------------------------------------ load files
    const loadFiles = useCallback(
        async (signal) => {
            if (!projectId) {
                setFiles([]);
                return;
            }
            try {
                setFilesLoading(true);
                const data = await workbenchApi.listFiles(projectId);
                if (signal?.cancelled) return;
                setFiles(data || []);
            } catch (err) {
                if (signal?.cancelled) return;
                setFiles([]);
                showToast(err.message || "Unable to load workspace files.", "error");
            } finally {
                if (!signal?.cancelled) setFilesLoading(false);
            }
        },
        [projectId, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadFiles(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadFiles]);

    // Workspace mới: mở sẵn các folder cấp 1 để nhìn thấy cấu trúc ngay.
    // Chỉ chạy khi danh sách file đổi (không reset thao tác mở/đóng của người dùng).
    useEffect(() => {
        setExpandedFolders(new Set(collectFolderPaths(tree).filter((path) => !path.includes("/"))));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tree.length]);

    // ---------------------------------------------------- load conversations
    const loadConversations = useCallback(
        async (signal) => {
            if (!projectId || !sessionUser?.id) {
                setConversations([]);
                return;
            }
            try {
                const page = await chatApi.listConversations({
                    ownerId: sessionUser.id,
                    status: convoFilter,
                    projectId,
                    size: 50,
                });
                if (signal?.cancelled) return;
                setConversations(page?.items || []);
            } catch (err) {
                if (signal?.cancelled) return;
                setConversations([]);
                showToast(err.message || "Unable to load conversations.", "error");
            }
        },
        [projectId, sessionUser?.id, convoFilter, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadConversations(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadConversations]);

    // --------------------------------------------------- conversation opening
    useEffect(() => {
        if (conversation?.id) {
            setActiveConversationId(conversation.id);
        } else {
            setActiveConversationId(null);
        }
    }, [conversation?.id]);

    useEffect(() => {
        if (!activeConversationId) {
            setMessages([]);
            setSettings(null);
            return undefined;
        }
        const signal = { cancelled: false };
        (async () => {
            try {
                const [loadedMessages, loadedSettings] = await Promise.all([
                    chatApi.getMessages(activeConversationId),
                    workbenchApi.getSettings(projectId, activeConversationId),
                ]);
                if (signal.cancelled) return;
                setMessages(loadedMessages || []);
                setSettings(loadedSettings);
            } catch (err) {
                if (signal.cancelled) return;
                showToast(err.message || "Unable to open this conversation.", "error");
            }
        })();
        return () => {
            signal.cancelled = true;
        };
    }, [activeConversationId, projectId, showToast]);

    // --------------------------------------------------- canvas lists (picker)
    useEffect(() => {
        if (activeSubView !== "canvas" || !projectId) return undefined;
        const signal = { cancelled: false };
        (async () => {
            try {
                const [loadedWorkflows, loadedAgents] = await Promise.all([
                    workflowApi.list(projectId),
                    agentApi.list(projectId),
                ]);
                if (signal.cancelled) return;
                setWorkflows(loadedWorkflows || []);
                setAgents(loadedAgents || []);
            } catch (err) {
                if (signal.cancelled) return;
                showToast(err.message || "Unable to load workflows and agents.", "error");
            }
        })();
        return () => {
            signal.cancelled = true;
        };
    }, [activeSubView, projectId, showToast]);

    // -------------------------------------------------------- file handlers
    const handleOpenFile = async (node) => {
        if (!projectId || !node?.id) return;
        if (isDirty && activeFile && !window.confirm("Discard unsaved changes?")) return;
        try {
            const content = await workbenchApi.getFile(projectId, node.id);
            setActiveFile(content);
            setDraft(content.content ?? "");
        } catch (err) {
            showToast(err.message || "Unable to open the file.", "error");
        }
    };

    const handleSaveFile = async () => {
        if (!projectId || !activeFile) return;
        try {
            setSavingFile(true);
            const saved = await workbenchApi.saveFile(projectId, activeFile.id, { content: draft });
            setActiveFile(saved);
            setDraft(saved.content ?? "");
            setFiles((prev) =>
                prev.map((file) =>
                    file.id === saved.id
                        ? {
                              ...file,
                              lineCount: saved.lineCount,
                              sizeBytes: saved.sizeBytes,
                              editedByUser: true,
                          }
                        : file,
                ),
            );
            showToast("File saved.", "success");
        } catch (err) {
            showToast(err.message || "Unable to save the file.", "error");
        } finally {
            setSavingFile(false);
        }
    };

    const handleDeleteFile = async () => {
        if (!projectId || !activeFile) return;
        try {
            await workbenchApi.deleteFile(projectId, activeFile.id);
            setFiles((prev) => prev.filter((file) => file.id !== activeFile.id));
            setActiveFile(null);
            setDraft("");
            showToast("File deleted.", "success");
        } catch (err) {
            showToast(err.message || "Unable to delete the file.", "error");
        }
    };

    const handleCreateFile = async () => {
        if (!projectId) return;
        const path = newFilePath.trim();
        if (!path) {
            showToast("Enter a file path first.", "info");
            return;
        }
        try {
            setCreatingFile(true);
            const created = await workbenchApi.createFile(projectId, {
                path,
                content: extensionOfPath(path) === "" ? "" : PLACEHOLDER_FILE,
            });
            setFiles((prev) => [...prev.filter((file) => file.id !== created.id), created]);
            setIsCreateFileOpen(false);
            setNewFilePath("");
            showToast("File created.", "success");
        } catch (err) {
            showToast(err.message || "Unable to create the file.", "error");
        } finally {
            setCreatingFile(false);
        }
    };

    // Cây mở rộng tới folder chứa file vừa tạo/upload để người dùng thấy ngay.
    const revealPath = (path) => {
        const segments = path.split("/");
        const folders = segments
            .slice(0, -1)
            .map((_, index) => segments.slice(0, index + 1).join("/"));
        setExpandedFolders((prev) => new Set([...prev, ...folders]));
    };

    const handleUploadFiles = async (event) => {
        const input = event.target;
        const picked = Array.from(input.files || []);
        input.value = "";
        if (!projectId || !picked.length) return;

        try {
            const payload = await Promise.all(
                picked.map(
                    (file) =>
                        new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () =>
                                resolve({
                                    path: file.webkitRelativePath || file.name,
                                    content: String(reader.result ?? ""),
                                });
                            reader.onerror = () => resolve({ path: file.name, content: "" });
                            reader.readAsText(file);
                        }),
                ),
            );
            const saved = await workbenchApi.sync(projectId, payload);
            setFiles((prev) => {
                const byPath = new Map(prev.map((file) => [file.path, file]));
                saved.forEach((file) => byPath.set(file.path, file));
                return [...byPath.values()];
            });
            saved.forEach((file) => revealPath(file.path));
            showToast(`Uploaded ${saved.length} file(s).`, "success");
        } catch (err) {
            showToast(err.message || "Unable to upload files.", "error");
        }
    };

    const handleSyncToFolder = async () => {
        if (!projectId) return;
        const picker = folderInputRef.current;
        if (!picker) return;
        picker.value = "";
        picker.click();
    };

    const handleToggleFolder = (path) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const handleExpandAll = () => {
        const all = collectFolderPaths(tree);
        setExpandedFolders(new Set(all).size >= expandedFolders.size ? new Set() : new Set(all));
    };

    const handleDownloadWorkspace = async () => {
        if (!projectId) return;
        try {
            const filename = `${project?.name || "workspace"}.md`;
            const blob = await workbenchApi.downloadWorkspace(projectId, filename);
            downloadBlob(blob, filename);
            showToast("Workspace downloaded.", "success");
        } catch (err) {
            showToast(err.message || "Unable to download the workspace.", "error");
        }
    };

    // ------------------------------------------------------ convo handlers
    const handleSelectConversation = (item) => {
        setActiveConversationId(item.id);
        setIsConvoListOpen(false);
        onOpenConversation?.({
            id: item.id,
            title: item.title,
            projectId,
            lastActivity: formatRelative(item.updatedAt),
        });
    };

    const handleCreateConversation = async () => {
        if (!projectId || !sessionUser?.id) {
            showToast("Open a project first to start a conversation.", "info");
            return;
        }
        try {
            setCreatingConvo(true);
            const created = await chatApi.createSession({
                projectId,
                title: "New conversation",
            });
            setConversations((prev) => [created, ...prev]);
            setActiveConversationId(created.id);
            setIsConvoListOpen(false);
            onOpenConversation?.({
                id: created.id,
                title: created.title,
                projectId,
                lastActivity: "just now",
            });
            showToast("Conversation created.", "success");
        } catch (err) {
            showToast(err.message || "Unable to create a conversation.", "error");
        } finally {
            setCreatingConvo(false);
        }
    };

    // --------------------------------------------------- settings handlers
    const patchSettings = async (changes, successMessage) => {
        if (!projectId || !activeConversationId) {
            showToast("Open a conversation first to change these settings.", "info");
            return;
        }
        try {
            const saved = await workbenchApi.updateSettings(
                projectId,
                activeConversationId,
                changes,
            );
            setSettings(saved);
            setConversations((prev) =>
                prev.map((item) =>
                    item.id === activeConversationId
                        ? { ...item, model: saved.model || item.model }
                        : item,
                ),
            );
            if (successMessage) showToast(successMessage, "success");
        } catch (err) {
            showToast(err.message || "Unable to update settings.", "error");
        }
    };

    const handleSendPrompt = async () => {
        const content = prompt.trim();
        if (!content || !activeConversationId) {
            showToast("Pick a conversation and type a message first.", "info");
            return;
        }
        try {
            setSending(true);
            const message = await chatApi.sendMessage(activeConversationId, {
                content,
                role: "USER",
            });
            setMessages((prev) => [...prev, message]);
            setPrompt("");
            setSettings((prev) => (prev ? { ...prev } : prev));
            showToast("Message sent.", "success");
        } catch (err) {
            showToast(err.message || "Unable to send the message.", "error");
        } finally {
            setSending(false);
        }
    };

    const handleDownloadTranscript = async () => {
        if (!activeConversationId) {
            showToast("Open a conversation first.", "info");
            return;
        }
        // Transcript do BE dựng để luôn khớp dữ liệu đã lưu; nếu chưa có tin nào
        // thì vẫn tải được file trống có tiêu đề.
        try {
            const blob = await workbenchApi.downloadTranscript(projectId, activeConversationId);
            downloadBlob(blob, "transcript.md");
            showToast("Transcript downloaded.", "success");
        } catch (err) {
            showToast(err.message || "Unable to download the transcript.", "error");
        }
    };

    const handleDownloadLocalTranscript = () => {
        const content = buildTranscriptMarkdown({
            projectName: project?.name,
            title: activeConversation?.title,
            messages,
        });
        downloadTextFile("transcript.md", content);
        showToast("Transcript downloaded.", "success");
    };

    const modelOptions = useMemo(() => {
        const options = (settings?.models || []).map((model) => ({
            value: `${model.provider}::${model.model}`,
            label: model.connected ? model.label : `${model.label} · connect key`,
        }));
        return options.length ? options : [{ value: "", label: "No model available" }];
    }, [settings?.models]);

    const currentModelValue =
        settings?.provider && settings?.model ? `${settings.provider}::${settings.model}` : "";

    const agentOptions = useMemo(
        () => [
            { value: "", label: "None" },
            ...(settings?.agents || []).map((agent) => ({
                value: agent.id,
                label: agent.name,
                color: "blue",
            })),
        ],
        [settings?.agents],
    );

    const workflowOptions = useMemo(
        () => [
            { value: "", label: "None" },
            ...(settings?.workflows || []).map((workflow) => ({
                value: workflow.id,
                label: workflow.name,
                color: "amber",
            })),
        ],
        [settings?.workflows],
    );

    const workflowById = (id) => workflows.find((workflow) => workflow.id === id) || null;

    if (!projectId) {
        return (
            <div className="workbench-main-viewport">
                <div className="wb-state-card">Open a project first to use the workbench.</div>
            </div>
        );
    }

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
                                {filesLoading && <Loader2 size={12} className="wb-spin" />}
                                <button
                                    type="button"
                                    className="btn-icon-ghost"
                                    title="Refresh"
                                    onClick={() => loadFiles()}
                                >
                                    <RefreshCw size={12} />
                                </button>
                            </div>

                            <div className="wb-header-right-controls">
                                <button
                                    type="button"
                                    className="btn-sync-to-folder-pill"
                                    onClick={handleSyncToFolder}
                                >
                                    <FolderSync size={12} />
                                    <span>Sync to folder</span>
                                </button>

                                <div className="wb-pane-more-relative">
                                    <button
                                        type="button"
                                        className="btn-icon-ghost"
                                        onClick={() => setIsFilesMenuOpen((prev) => !prev)}
                                    >
                                        <MoreVertical size={14} />
                                    </button>

                                    {isFilesMenuOpen && (
                                        <div className="wb-files-dropdown-menu">
                                            <button
                                                type="button"
                                                className="dropdown-menu-item"
                                                onClick={() => {
                                                    setIsFilesMenuOpen(false);
                                                    fileInputRef.current?.click();
                                                }}
                                            >
                                                <Upload size={14} />
                                                <span>Upload file</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="dropdown-menu-item"
                                                onClick={() => {
                                                    setIsFilesMenuOpen(false);
                                                    setIsCreateFileOpen(true);
                                                }}
                                            >
                                                <Plus size={14} />
                                                <span>New file</span>
                                            </button>
                                            <div className="dropdown-menu-item with-caption">
                                                <div className="item-title-row">
                                                    <FolderSync size={14} />
                                                    <span>Sync to local folder</span>
                                                </div>
                                                <small>
                                                    Picks a folder from your machine and uploads
                                                    every text file into this workspace.
                                                </small>
                                            </div>
                                            <button
                                                type="button"
                                                className="dropdown-menu-item"
                                                onClick={() => {
                                                    setIsFilesMenuOpen(false);
                                                    handleDownloadWorkspace();
                                                }}
                                            >
                                                <Download size={14} />
                                                <span>Download workspace</span>
                                            </button>
                                            <div className="dropdown-menu-divider" />
                                            <button
                                                type="button"
                                                className="dropdown-menu-item"
                                                onClick={() => {
                                                    setIsFilesMenuOpen(false);
                                                    loadFiles();
                                                }}
                                            >
                                                <RefreshCw size={14} />
                                                <span>Refresh</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="dropdown-menu-item"
                                                onClick={() => {
                                                    setIsFilesMenuOpen(false);
                                                    handleExpandAll();
                                                }}
                                            >
                                                {expandedFolders.size ? (
                                                    <ChevronsDownUp size={14} />
                                                ) : (
                                                    <ChevronsUpDown size={14} />
                                                )}
                                                <span>
                                                    {expandedFolders.size
                                                        ? "Collapse all"
                                                        : "Expand all"}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bộ lọc file: tìm theo đường dẫn + lọc theo loại file */}
                        <div className="wb-files-filter-row">
                            <div className="wb-files-search">
                                <Search size={12} />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={fileSearch}
                                    onChange={(event) => setFileSearch(event.target.value)}
                                />
                            </div>
                            <CustomSelector
                                options={extensionOptions}
                                value={extensionFilter}
                                onChange={setExtensionFilter}
                                placeholder="Type"
                                className="wb-extension-selector"
                            />
                        </div>

                        {isCreateFileOpen && (
                            <div className="wb-create-file-inline">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="src/utils/helper.js"
                                    value={newFilePath}
                                    onChange={(event) => setNewFilePath(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") handleCreateFile();
                                        if (event.key === "Escape") setIsCreateFileOpen(false);
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn-wb-mini primary"
                                    disabled={creatingFile}
                                    onClick={handleCreateFile}
                                >
                                    {creatingFile ? "Creating..." : "Create"}
                                </button>
                                <button
                                    type="button"
                                    className="btn-wb-mini"
                                    onClick={() => setIsCreateFileOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            hidden
                            onChange={handleUploadFiles}
                        />
                        <input
                            ref={folderInputRef}
                            type="file"
                            multiple
                            hidden
                            webkitdirectory=""
                            directory=""
                            onChange={handleUploadFiles}
                        />

                        {(() => {
                            const filtered = filterTree(tree, fileSearch, extensionFilter);
                            if (!filtered.length) {
                                return (
                                    <div className="wb-files-empty-stage">
                                        <Folder size={32} className="glyph-empty-folder" />
                                        <span>
                                            {files.length
                                                ? "No files match this filter"
                                                : "No files found"}
                                        </span>
                                    </div>
                                );
                            }
                            return (
                                <WorkbenchFileTree
                                    nodes={filtered}
                                    expanded={expandedFolders}
                                    activePath={activeFile?.path}
                                    onToggleFolder={handleToggleFolder}
                                    onOpenFile={handleOpenFile}
                                />
                            );
                        })()}
                    </div>

                    {/* CỘT 2: EDITOR VIEWPORT */}
                    <div className="wb-column-editor-pane">
                        <div className="wb-pane-header-row">
                            <div className="wb-pane-title-group">
                                <SplitSquareVertical size={14} />
                                <span>{activeFile ? activeFile.name : "No file open"}</span>
                                {isDirty && (
                                    <span className="wb-dirty-dot" title="Unsaved changes" />
                                )}
                            </div>
                            <div className="wb-header-right-controls">
                                {activeFile && (
                                    <>
                                        <button
                                            type="button"
                                            className="btn-icon-ghost"
                                            title="Save (Ctrl+S)"
                                            onClick={handleSaveFile}
                                            disabled={!isDirty || savingFile}
                                        >
                                            {savingFile ? (
                                                <Loader2 size={13} className="wb-spin" />
                                            ) : (
                                                <Save size={13} />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-icon-ghost"
                                            title="Delete file"
                                            onClick={handleDeleteFile}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="editor-sub-breadcrumb">
                            {activeFile
                                ? `${activeFile.path} · ${languageOfPath(activeFile.path)} · ${formatBytes(
                                      activeFile.sizeBytes,
                                  )}`
                                : "Select a file to view"}
                        </div>

                        {activeFile ? (
                            <div className="wb-editor-surface">
                                <textarea
                                    className="wb-editor-textarea"
                                    spellCheck={false}
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
                                            event.preventDefault();
                                            handleSaveFile();
                                        }
                                    }}
                                />
                                <div className="wb-editor-statusbar">
                                    <span>
                                        {draft ? draft.split("\n").length : 0} lines ·{" "}
                                        {formatBytes(new Blob([draft]).size)}
                                    </span>
                                    <span>{isDirty ? "Unsaved changes" : "Saved"}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="wb-editor-empty-stage">
                                <FileText size={32} className="glyph-empty-file" />
                                <span>Select a file to view its contents</span>
                            </div>
                        )}
                    </div>

                    {/* CỘT 3: CHAT CONTROLS */}
                    <div className="wb-column-chat-pane">
                        <div className="wb-pane-header-row">
                            <div className="wb-convo-selector-wrap">
                                <button
                                    type="button"
                                    className="btn-convo-dropdown"
                                    onClick={() => setIsConvoListOpen((prev) => !prev)}
                                >
                                    <MessageSquare size={13} />
                                    <span>{activeConversation?.title || "New conversation"}</span>
                                </button>

                                {isConvoListOpen && (
                                    <div className="wb-convo-flyout-card">
                                        <div className="convo-flyout-header">
                                            <button
                                                type="button"
                                                className="btn-create-convo-link"
                                                disabled={creatingConvo}
                                                onClick={handleCreateConversation}
                                            >
                                                <Plus size={13} />
                                                <span>
                                                    {creatingConvo
                                                        ? "Creating..."
                                                        : "New Conversation"}
                                                </span>
                                            </button>
                                        </div>
                                        <div className="convo-flyout-title-line">
                                            <strong>Conversations</strong>
                                            <span>{conversations.length}</span>
                                        </div>
                                        <div className="convo-flyout-filters">
                                            {CONVO_FILTERS.map((filter) => (
                                                <button
                                                    key={filter.value}
                                                    type="button"
                                                    className={
                                                        convoFilter === filter.value
                                                            ? "active-pill"
                                                            : ""
                                                    }
                                                    onClick={() => setConvoFilter(filter.value)}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="convo-flyout-list-items">
                                            {conversations.length ? (
                                                conversations.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="convo-item-row"
                                                        data-active={
                                                            activeConversationId === item.id
                                                        }
                                                        onClick={() =>
                                                            handleSelectConversation(item)
                                                        }
                                                    >
                                                        <span
                                                            className={`dot-status ${
                                                                item.archived ? "amber" : "green"
                                                            }`}
                                                        />
                                                        <div className="convo-meta-col">
                                                            <strong>{item.title}</strong>
                                                            <small>
                                                                {formatRelative(item.updatedAt)}
                                                                {item.model
                                                                    ? ` · ${item.model}`
                                                                    : ""}
                                                            </small>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="convo-empty-text">
                                                    No conversations in this project yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="wb-header-right-controls">
                                <button
                                    type="button"
                                    className="btn-icon-ghost"
                                    title="Download transcript"
                                    onClick={handleDownloadTranscript}
                                >
                                    <Maximize2 size={13} />
                                </button>
                                <button
                                    type="button"
                                    className="btn-icon-ghost"
                                    title="Reload messages"
                                    onClick={() =>
                                        activeConversationId &&
                                        chatApi.getMessages(activeConversationId).then(setMessages)
                                    }
                                >
                                    <RotateCw size={13} />
                                </button>
                            </div>
                        </div>

                        <div className="wb-chat-middle-content">
                            {messages.length ? (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`wb-chat-bubble ${message.role === "USER" ? "user" : "assistant"}`}
                                    >
                                        <div className="wb-chat-bubble-role">
                                            {message.role === "USER" ? "You" : "Assistant"}
                                        </div>
                                        <div className="wb-chat-bubble-body">{message.content}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="wb-chat-empty">
                                    <MessageSquare size={26} />
                                    <span>
                                        {activeConversationId
                                            ? "No messages yet. Ask something to start."
                                            : "Select or create a conversation to chat."}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Thanh Prompt Input dưới đáy */}
                        <div className="wb-chat-prompt-footer">
                            <div className="prompt-input-surface-box">
                                <textarea
                                    className="wb-prompt-textarea"
                                    placeholder={
                                        activeConversationId
                                            ? "Ask the agent to change code, explain a file..."
                                            : "Pick a conversation first"
                                    }
                                    value={prompt}
                                    disabled={!activeConversationId}
                                    onChange={(event) => setPrompt(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            handleSendPrompt();
                                        }
                                    }}
                                />
                                <div className="prompt-bottom-controls-bar">
                                    <div className="prompt-left-tools-wrap">
                                        <button
                                            type="button"
                                            className="btn-plus-tool-circle"
                                            onClick={() => setIsToolsPopupOpen((prev) => !prev)}
                                        >
                                            <Plus size={15} />
                                        </button>

                                        {isToolsPopupOpen && (
                                            <div className="prompt-tools-popup-menu">
                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() => {
                                                        setIsToolsPopupOpen(false);
                                                        fileInputRef.current?.click();
                                                    }}
                                                >
                                                    <Paperclip size={14} />
                                                    <span>Add files or photos</span>
                                                    <kbd>Ctrl+Shift+A</kbd>
                                                </button>
                                                <div className="tool-menu-row with-control">
                                                    <Bot size={14} />
                                                    <span>Agent</span>
                                                </div>
                                                <div className="tool-menu-select-row">
                                                    <CustomSelector
                                                        options={agentOptions}
                                                        value={settings?.agentId || ""}
                                                        onChange={(value) =>
                                                            patchSettings(
                                                                value
                                                                    ? { agentId: value }
                                                                    : { clearAgent: true },
                                                                value
                                                                    ? "Agent selected."
                                                                    : "Agent cleared.",
                                                            )
                                                        }
                                                        placeholder="None"
                                                        className="wb-tool-selector"
                                                    />
                                                </div>
                                                <div className="tool-menu-row with-control">
                                                    <Sparkles size={14} />
                                                    <span>Skill</span>
                                                </div>
                                                <div className="tool-menu-select-row">
                                                    <CustomSelector
                                                        options={SKILL_OPTIONS}
                                                        value={settings?.skillMode || "Auto"}
                                                        onChange={(value) =>
                                                            patchSettings({ skillMode: value })
                                                        }
                                                        placeholder="Auto"
                                                        className="wb-tool-selector"
                                                    />
                                                </div>
                                                <div className="tool-menu-row with-control">
                                                    <Workflow size={14} />
                                                    <span>Workflow</span>
                                                </div>
                                                <div className="tool-menu-select-row">
                                                    <CustomSelector
                                                        options={workflowOptions}
                                                        value={settings?.workflowId || ""}
                                                        onChange={(value) =>
                                                            patchSettings(
                                                                value
                                                                    ? { workflowId: value }
                                                                    : { clearWorkflow: true },
                                                                value
                                                                    ? "Workflow selected."
                                                                    : "Workflow cleared.",
                                                            )
                                                        }
                                                        placeholder="None"
                                                        className="wb-tool-selector"
                                                    />
                                                </div>
                                                <div className="tool-menu-divider" />
                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() =>
                                                        patchSettings(
                                                            { autoApprove: !settings?.autoApprove },
                                                            settings?.autoApprove
                                                                ? "Auto approve off."
                                                                : "Auto approve on.",
                                                        )
                                                    }
                                                >
                                                    <Sliders size={14} />
                                                    <span>Auto Approve</span>
                                                    <span className="tool-menu-val">
                                                        {settings?.autoApprove ? "ON" : "OFF"}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() =>
                                                        patchSettings(
                                                            {
                                                                hideThinking:
                                                                    !settings?.hideThinking,
                                                            },
                                                            settings?.hideThinking
                                                                ? "Thinking visible."
                                                                : "Thinking hidden.",
                                                        )
                                                    }
                                                >
                                                    <EyeOff size={14} />
                                                    <span>Hide Thinking</span>
                                                    <span className="tool-menu-val">
                                                        {settings?.hideThinking ? "ON" : "OFF"}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() => {
                                                        setIsToolsPopupOpen(false);
                                                        handleDownloadLocalTranscript();
                                                    }}
                                                >
                                                    <Download size={14} />
                                                    <span>Download transcript (.md)</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="prompt-right-tools-wrap">
                                        <CustomSelector
                                            options={modelOptions}
                                            value={currentModelValue}
                                            onChange={(value) => {
                                                const [provider, model] = value.split("::");
                                                patchSettings(
                                                    { provider, model },
                                                    `Model set to ${model}.`,
                                                );
                                            }}
                                            placeholder="Select model"
                                            className="wb-model-selector"
                                        />
                                        <button
                                            type="button"
                                            className={`btn-send-message ${prompt.trim() ? "enabled" : ""}`}
                                            disabled={!prompt.trim() || sending}
                                            onClick={handleSendPrompt}
                                            title="Send (Enter)"
                                        >
                                            {sending ? (
                                                <Loader2 size={14} className="wb-spin" />
                                            ) : (
                                                <SendHorizontal size={14} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <small className="ai-disclaimer-text">
                                • {activeConversation?.model || "No model selected"} · AI can make
                                mistakes. Review the results carefully.
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

                        <div className="canvas-picker-items-list">
                            {(canvasSidebarTab === "workflows" ? workflows : agents).length ? (
                                (canvasSidebarTab === "workflows" ? workflows : agents).map(
                                    (item) => (
                                        <div
                                            key={item.id}
                                            className={`canvas-item-entry ${
                                                selectedWorkflowId === item.id ? "active" : ""
                                            }`}
                                            onClick={() =>
                                                setSelectedWorkflowId(
                                                    selectedWorkflowId === item.id ? null : item.id,
                                                )
                                            }
                                        >
                                            <span className="indicator-line cyan" />
                                            <span>{item.name}</span>
                                        </div>
                                    ),
                                )
                            ) : (
                                <div className="canvas-empty-text">
                                    No {canvasSidebarTab} in this project yet.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="canvas-graph-main-pane">
                        <div className="canvas-graph-top-actions">
                            <span className="canvas-status-tag">
                                {workflowById(selectedWorkflowId)?.stepsSummary
                                    ? `Steps: ${workflowById(selectedWorkflowId).meta}`
                                    : "Ready"}
                            </span>
                            <div className="canvas-top-btn-cluster">
                                <button
                                    type="button"
                                    className="btn-canvas-save"
                                    onClick={() =>
                                        showToast(
                                            "Canvas is read-only in this version. Edit steps in the Workflows tab.",
                                            "info",
                                        )
                                    }
                                >
                                    <Save size={13} />
                                    <span>Save</span>
                                </button>
                            </div>
                        </div>

                        <div className="canvas-nodes-flow-container">
                            {(() => {
                                const selected = workflowById(selectedWorkflowId);
                                if (!selected) {
                                    return (
                                        <div className="canvas-empty-text">
                                            Select a workflow on the left to preview its steps.
                                        </div>
                                    );
                                }
                                // Chuỗi bước lưu dạng "A → (B || C) → D": tách theo mũi tên
                                // để mỗi bước thành một node thật từ BE.
                                const steps = String(selected.stepsSummary || "")
                                    .split("→")
                                    .map((step) => step.trim())
                                    .filter(Boolean);
                                if (!steps.length) {
                                    return (
                                        <div className="canvas-empty-text">
                                            This workflow has no steps yet.
                                        </div>
                                    );
                                }
                                return steps.map((step, index) => {
                                    const parallel = step.includes("||");
                                    const roles = parallel
                                        ? step
                                              .replace(/[()]/g, "")
                                              .split("||")
                                              .map((r) => r.trim())
                                        : [step];
                                    return (
                                        <div key={`${step}-${index}`} className="canvas-node-wrap">
                                            {index > 0 && (
                                                <div className="node-flow-connector-line" />
                                            )}
                                            <div className="canvas-node-card">
                                                <div className="node-header-row">
                                                    <div className="node-title-group">
                                                        {parallel ? (
                                                            <GitBranch size={16} />
                                                        ) : index === 0 ? (
                                                            <Bot size={16} />
                                                        ) : (
                                                            <Server size={16} />
                                                        )}
                                                        <strong>{step}</strong>
                                                    </div>
                                                    <span className="node-role-badge">
                                                        {parallel ? "PARALLEL" : "SEQUENTIAL"}
                                                    </span>
                                                </div>
                                                {parallel && (
                                                    <div className="node-parallel-agents-tags">
                                                        {roles.map((role) => (
                                                            <span key={role}>{role}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/** Lọc cây theo từ khoá + loại file nhưng vẫn giữ folder cha của file khớp. */
const filterTree = (nodes, search, extension) => {
    const keyword = search.trim().toLowerCase();
    const ext = extension === "all" ? "" : extension;

    const walk = (list) =>
        list.reduce((acc, node) => {
            if (node.kind === "folder") {
                const children = walk(node.children);
                if (children.length) acc.push({ ...node, children });
                return acc;
            }
            const keywordOk = !keyword || node.path.toLowerCase().includes(keyword);
            const extOk = !ext || (node.extension || "").toLowerCase() === ext;
            if (keywordOk && extOk) acc.push(node);
            return acc;
        }, []);

    return walk(nodes);
};

export default WorkbenchWorkspace;
