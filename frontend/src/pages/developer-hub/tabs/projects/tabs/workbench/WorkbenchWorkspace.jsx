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
    MessageCircleMore,
    GitCompare,
    Paperclip,
    Bot,
    Sparkles,
    Zap,
    Check,
    EyeOff,
    Save,
    Loader2,
    Trash2,
    Server,
    GitBranch,
    BookOpen,
    Orbit,
    Pencil,
    ArrowUp,
    Code2,
    Bug,
    TestTube,
    Globe,
    X,
    Play,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    CheckCircle2,
    PanelsTopLeft,
    Layers,
    Cpu,
} from "lucide-react";
import { agentApi, chatApi, workflowApi, workbenchApi } from "../../../../../../api";

// Workbench nằm ở tabs/projects/tabs/workbench nên cần 5 cấp "../" để về src.
import CustomSelector from "../../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../../context/ToastContext";
import WorkbenchFileTree from "./components/WorkbenchFileTree";
import WorkbenchGalaxy from "./components/WorkbenchGalaxy";
import GitMarkIcon from "./components/GitMarkIcon";
import {
    buildFileTree,
    collectExtensions,
    collectFolderPaths,
    formatBytes,
    languageOfPath,
} from "./helpers/fileTree";
import { highlightCode } from "./helpers/syntax";
import { markdownToHtml } from "./helpers/markdown";
import { buildTranscriptMarkdown, downloadTextFile } from "./helpers/transcript";
import "./WorkbenchWorkspace.css";
import { getSessionUser } from "../../../../../../components/common/utils/session";

const CONVO_FILTERS = [
    { value: "ACTIVE", label: "Active" },
    { value: "ARCHIVED", label: "Archived" },
    { value: "ALL", label: "All" },
];

/* Gợi ý mở đầu cho khung chat (2x2 như ảnh mẫu) */
const CHAT_SUGGESTIONS = [
    {
        id: "explain",
        icon: Code2,
        title: "Explain codebase",
        desc: "Understand the project structure",
        prompt: "Explain the architecture of this project.",
    },
    {
        id: "bugs",
        icon: Bug,
        title: "Find bugs",
        desc: "Scan for issues and vulnerabilities",
        prompt: "Scan this project for bugs and security issues.",
    },
    {
        id: "tests",
        icon: TestTube,
        title: "Write tests",
        desc: "Cover the riskiest paths first",
        prompt: "Write tests for the most important modules in this project.",
    },
    {
        id: "feature",
        icon: Sparkles,
        title: "Plan a feature",
        desc: "Turn an idea into a task list",
        prompt: "Help me plan a new feature end to end: ",
    },
];

/* Nhãn gợi ý cú pháp dưới ô prompt */
const CHAT_SLASH_HINTS = [
    { key: "!", label: "agents" },
    { key: "/", label: "skills" },
    { key: "#", label: "workflows" },
    { key: "@", label: "files" },
    { key: "↑", label: "history" },
    { key: "?", label: "help" },
];

/* Icon cho item ở Canvas (workflow/agent đều có iconKey từ BE) */
const CANVAS_ICON_MAP = {
    bot: Bot,
    cpu: Cpu,
    server: Server,
    code: Code2,
    file: FileText,
    fileplus: FileText,
    "file-plus": FileText,
    search: Search,
    db: Layers,
    cloud: Layers,
    shield: Layers,
    network: GitBranch,
    git: GitBranch,
    refresh: RotateCcw,
    terminal: Code2,
    palette: Sparkles,
    monitor: PanelsTopLeft,
    layers: Layers,
};

const canvasIconFor = (item) =>
    CANVAS_ICON_MAP[item?.iconKey] || (item?.kind === "agent" ? Cpu : Layers);

/* Cấu hình cho picker mở ra từ nút "+" */
const PICKER_CONFIG = {
    agent: {
        title: "Filter agents…",
        hint: "TYPE TO FILTER · ↑↓ NAVIGATE · ENTER PICK · ESC CLOSE",
        empty: "No agents match that filter.",
        badge: "agent",
    },
    skill: {
        title: "Filter skills…",
        hint: "TYPE TO FILTER · ↑↓ NAVIGATE · ENTER PICK · ESC CLOSE",
        empty: "No skills match that filter.",
        badge: "skill",
    },
    workflow: {
        title: "Filter workflows…",
        hint: "TYPE TO FILTER · ↑↓ NAVIGATE · ENTER PICK · ESC CLOSE",
        empty: "No workflows match that filter.",
        badge: "workflow",
    },
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

/* Khung chào khi conversation chưa có tin nhắn (dùng cho cả tab IDE & Chat) */
const ChatWelcome = ({ userName, onPick, disabled = false }) => (
    <div className="wb-chat-welcome">
        <div className="wb-welcome-orb" aria-hidden="true">
            <Sparkles size={22} />
        </div>
        <h3>Hey {userName}, what to build today?</h3>
        <p>I can write code, debug issues, explain architecture, and more.</p>

        <div className="wb-suggest-grid">
            {CHAT_SUGGESTIONS.map(({ id, icon: Icon, title, desc, prompt }) => (
                <button
                    key={id}
                    type="button"
                    className="wb-suggest-card"
                    onClick={() => onPick(prompt)}
                    disabled={disabled}
                >
                    <span className="wb-suggest-icon">
                        <Icon size={15} />
                    </span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                </button>
            ))}
        </div>

        <div className="wb-slash-hint-row">
            {CHAT_SLASH_HINTS.map((hint) => (
                <span key={hint.key}>
                    <kbd>{hint.key}</kbd>
                    {hint.label}
                </span>
            ))}
        </div>
    </div>
);

const WorkbenchWorkspace = ({
    project = null,
    activeSubView = "ide",
    conversation = null,
    onOpenConversation,
    onSubViewChange,
    onOpenWorkflows,
}) => {
    const projectId = project?.id || null;
    const sessionUser = getSessionUser();
    const firstName = (sessionUser?.name || "there").trim().split(/\s+/)[0] || "there";
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
    const preRef = useRef(null);
    const gutterRef = useRef(null);

    // -------------------------------------------------- resizable IDE columns
    const [filesWidth, setFilesWidth] = useState(280);
    const [chatWidth, setChatWidth] = useState(440);

    const startResize = (side) => (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = side === "files" ? filesWidth : chatWidth;
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);

        const onMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
            if (side === "files") {
                setFilesWidth(clamp(startWidth + delta, 220, 600));
            } else {
                setChatWidth(clamp(startWidth - delta, 320, 640));
            }
        };
        const onUp = () => {
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerup", onUp);
            target.removeEventListener("pointercancel", onUp);
        };
        target.addEventListener("pointermove", onMove);
        target.addEventListener("pointerup", onUp);
        target.addEventListener("pointercancel", onUp);
    };

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
    const [expandedTool, setExpandedTool] = useState(null);
    const [canvasSidebarTab, setCanvasSidebarTab] = useState("workflows");
    const [workflows, setWorkflows] = useState([]);
    const [agents, setAgents] = useState([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

    // ------------------------------------------------------------- preview
    const [previewFile, setPreviewFile] = useState(null);
    const [previewHtml, setPreviewHtml] = useState("");
    const [previewRaw, setPreviewRaw] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);

    // ------------------------------------------------------ chat composer UI
    const [pickerQuery, setPickerQuery] = useState("");
    const pickerInputRef = useRef(null);

    // --------------------------------------------------------- changes diff
    const [changeFile, setChangeFile] = useState(null);
    const [changeContent, setChangeContent] = useState("");
    const [changeLoading, setChangeLoading] = useState(false);

    // --------------------------------------------------------------- canvas
    const [canvasFilter, setCanvasFilter] = useState("");
    const [canvasNodes, setCanvasNodes] = useState([]);
    const [canvasZoom, setCanvasZoom] = useState(1);
    const [canvasDragOver, setCanvasDragOver] = useState(false);
    const canvasGridRef = useRef(null);

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

    // Preview có highlight syntax cho layer dưới editor
    const highlightedCode = useMemo(
        () =>
            highlightCode(
                draft,
                activeFile ? languageOfPath(activeFile.path) : "plaintext",
            ),
        [draft, activeFile],
    );
    const draftLineCount = useMemo(() => (draft ? draft.split("\n").length : 1), [draft]);

    // Workspace mặc định: chỉ có .gitignore → mở sẵn để người dùng thấy ngay
    const autoOpenedRef = useRef(false);
    useEffect(() => {
        if (autoOpenedRef.current || filesLoading) return;
        if (
            files.length === 1 &&
            files[0].path === ".gitignore" &&
            !activeFile
        ) {
            autoOpenedRef.current = true;
            handleOpenFile(files[0]);
        }
    }, [files, filesLoading, activeFile]);

    // Đồng bộ scroll giữa textarea (có thật) và layer highlight + gutter
    const handleEditorScroll = (event) => {
        const source = event.target;
        if (preRef.current) {
            preRef.current.scrollTop = source.scrollTop;
            preRef.current.scrollLeft = source.scrollLeft;
        }
        if (gutterRef.current) {
            gutterRef.current.scrollTop = source.scrollTop;
        }
    };

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

    // Ctrl+Shift+A: mở nhanh file picker (Add files or photos)
    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "a") {
                event.preventDefault();
                fileInputRef.current?.click();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

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

    // Mở file từ view khác (Galaxy / Changes): quay về IDE rồi load nội dung
    const handleOpenFileFromView = async (file) => {
        if (!file?.id) return;
        onSubViewChange?.("ide");
        await handleOpenFile(file);
    };

    // ------------------------------------------------------------- preview
    const handlePreviewFile = async (file) => {
        if (!projectId || !file?.id) return;
        try {
            setPreviewLoading(true);
            const content = await workbenchApi.getFile(projectId, file.id);
            setPreviewFile(content);
            setPreviewHtml(markdownToHtml(content.content ?? ""));
        } catch (err) {
            showToast(err.message || "Unable to open the file.", "error");
        } finally {
            setPreviewLoading(false);
        }
    };

    // Nút "Run App" của khung preview: mở file markdown đầu tiên để render
    const handleRunPreview = () => {
        if (markdownFiles.length) {
            handlePreviewFile(previewFile || markdownFiles[0]);
            return;
        }
        showToast("No previewable file in this workspace yet.", "info");
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
                content: "",
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
            return null;
        }
        try {
            setCreatingConvo(true);
            const created = await chatApi.createSession({
                projectId,
                title: "New conversation",
            });
            setConversations((prev) => [created, ...prev]);
            setActiveConversationId(created.id);
            setMessages([]);
            setPrompt("");
            setIsConvoListOpen(false);
            onOpenConversation?.({
                id: created.id,
                title: created.title,
                projectId,
                lastActivity: "just now",
            });
            showToast("Conversation created.", "success");
            return created;
        } catch (err) {
            showToast(err.message || "Unable to create a conversation.", "error");
            return null;
        } finally {
            setCreatingConvo(false);
        }
    };

    // Gợi ý trong khung chào: tạo conversation nếu chưa có rồi gửi luôn câu hỏi
    const handleSuggestionPick = async (text) => {
        let conversationId = activeConversationId;
        if (!conversationId) {
            const created = await handleCreateConversation();
            conversationId = created?.id || null;
        }
        if (!conversationId) return;
        await handleSendPrompt(text, conversationId);
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

    const handleSendPrompt = async (overrideText, overrideConversationId) => {
        const content = String(overrideText ?? prompt).trim();
        const conversationId = overrideConversationId || activeConversationId;
        if (!content || !conversationId) {
            showToast("Start a conversation and type a message first.", "info");
            return;
        }
        try {
            setSending(true);
            const message = await chatApi.sendMessage(conversationId, {
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

    // Nạp lại models/skills/agents từ BE cho conversation đang mở
    const handleReloadSettings = async () => {
        if (!projectId) return;
        try {
            const fresh = await workbenchApi.getSettings(
                projectId,
                activeConversationId || undefined,
            );
            setSettings(fresh);
            showToast("Models, skills & agents reloaded.", "success");
        } catch (err) {
            showToast(err.message || "Unable to reload settings.", "error");
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

    // ----------------------------------------------------- composer picker
    const openPicker = (kind) => {
        setPickerQuery("");
        setIsToolsPopupOpen(false);
        setExpandedTool((prev) => (prev === kind ? null : kind));
    };

    const agentPickerItems = useMemo(
        () =>
            (settings?.agents || []).map((agent) => ({
                value: agent.id,
                label: agent.name,
                color: agent.color,
                iconKey: agent.iconKey,
                description: agent.description || agent.role || "",
                example: agent.role || "",
                kind: "agent",
            })),
        [settings?.agents],
    );

    const skillPickerItems = useMemo(
        () => [
            {
                value: "Auto",
                label: "Auto",
                color: "#8B5CF6",
                iconKey: "sparkles",
                description: "The agent picks whichever skills the turn needs.",
                example: "e.g. explain the module, then patch the bug",
                kind: "skill",
            },
            {
                value: "Manual",
                label: "Manual",
                color: "#0EA5E9",
                iconKey: "wrench",
                description: "You choose every skill before the agent runs.",
                example: "e.g. only run the code-review skill",
                kind: "skill",
            },
        ],
        [],
    );

    const workflowPickerItems = useMemo(
        () =>
            (settings?.workflows || []).map((workflow) => ({
                value: workflow.id,
                label: workflow.name,
                color: workflow.color,
                iconKey: workflow.iconKey,
                description: workflow.stepsSummary ? `Steps: ${workflow.stepsSummary}` : "",
                example: workflow.type === "BUILT_IN" ? "Built-in workflow" : "Project workflow",
                kind: "workflow",
            })),
        [settings?.workflows],
    );

    const pickerItems =
        expandedTool === "agent"
            ? agentPickerItems
            : expandedTool === "skill"
              ? skillPickerItems
              : expandedTool === "workflow"
                ? workflowPickerItems
                : [];

    const pickerMeta = expandedTool ? PICKER_CONFIG[expandedTool] : null;

    const pickerQueryNormalized = pickerQuery.trim().toLowerCase();
    const filteredPickerItems = pickerQueryNormalized
        ? pickerItems.filter((item) =>
              `${item.label} ${item.description || ""}`
                  .toLowerCase()
                  .includes(pickerQueryNormalized),
          )
        : pickerItems;

    const choosePickerItem = (item) => {
        if (expandedTool === "agent") {
            patchSettings(
                item.value ? { agentId: item.value } : { clearAgent: true },
                item.value ? `Agent set to ${item.label}.` : "Agent cleared.",
            );
        } else if (expandedTool === "skill") {
            patchSettings({ skillMode: item.value }, `Skill mode set to ${item.label}.`);
        } else if (expandedTool === "workflow") {
            patchSettings(
                item.value ? { workflowId: item.value } : { clearWorkflow: true },
                item.value ? `Workflow set to ${item.label}.` : "Workflow cleared.",
            );
        }
        setExpandedTool(null);
        setPickerQuery("");
    };

    // -------------------------------------------------------- changes diff
    const handleSelectChangeFile = useCallback(
        async (file) => {
            if (!projectId || !file?.id) return;
            setChangeFile(file);
            setChangeLoading(true);
            setChangeContent("");
            try {
                const data = await workbenchApi.getFile(projectId, file.id);
                setChangeContent(data?.content ?? "");
            } catch (err) {
                showToast(err.message || "Unable to load the file.", "error");
            } finally {
                setChangeLoading(false);
            }
        },
        [projectId, showToast],
    );

    // --------------------------------------------------------------- canvas
    const handleCanvasDragStart = (event, item) => {
        setSelectedWorkflowId(item.id);
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(
            "application/x-wb-canvas-item",
            JSON.stringify({
                id: item.id,
                kind: canvasSidebarTab,
                name: item.name,
                color: item.color,
                iconKey: item.iconKey,
                stepsSummary: item.stepsSummary || "",
                role: item.role || "",
                type: item.type || "",
            }),
        );
    };

    const placeCanvasNode = (payload, x, y) => {
        setCanvasNodes((prev) => [
            ...prev,
            {
                key: `${payload.id}-${Date.now()}-${prev.length}`,
                ...payload,
                x: Math.max(8, Math.round(x)),
                y: Math.max(8, Math.round(y)),
            },
        ]);
    };

    const handleCanvasDrop = (event) => {
        event.preventDefault();
        setCanvasDragOver(false);
        const raw = event.dataTransfer.getData("application/x-wb-canvas-item");
        if (!raw) return;
        let payload;
        try {
            payload = JSON.parse(raw);
        } catch {
            return;
        }
        const rect = canvasGridRef.current?.getBoundingClientRect();
        if (!rect) return;
        placeCanvasNode(
            payload,
            (event.clientX - rect.left) / canvasZoom - 110,
            (event.clientY - rect.top) / canvasZoom - 30,
        );
        showToast(`${payload.name} added to the canvas.`, "success");
    };

    const handleCanvasAdd = (item) => {
        setSelectedWorkflowId(item.id);
        placeCanvasNode(
            {
                id: item.id,
                kind: canvasSidebarTab,
                name: item.name,
                color: item.color,
                iconKey: item.iconKey,
                stepsSummary: item.stepsSummary || "",
                role: item.role || "",
                type: item.type || "",
            },
            36 + (canvasNodes.length % 4) * 44,
            36 + (canvasNodes.length % 4) * 38,
        );
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

    // ------------------------------------------------------ derived lists
    // Changes: các file bạn đã tự chỉnh trong IDE (dữ liệu thật từ BE)
    const changedFiles = useMemo(
        () =>
            files
                .filter((file) => file.editedByUser)
                .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
        [files],
    );

    // Preview: danh sách markdown trong workspace
    const markdownFiles = useMemo(
        () => files.filter((file) => (file.language || "") === "markdown"),
        [files],
    );

    const selectedAgentName =
        settings?.agents?.find((agent) => agent.id === settings?.agentId)?.name || "None";
    const selectedWorkflowName =
        settings?.workflows?.find((wf) => wf.id === settings?.workflowId)?.name || "None";
    const selectedSkill = settings?.skillMode || "Auto";

    // Changes: tổng số dòng thêm cho cột trái + nội dung file đang xem
    const changesAddTotal = changedFiles.reduce((sum, file) => sum + (file.lineCount || 0), 0);
    const changeLines = changeContent ? changeContent.split("\n") : [];

    // Canvas: danh sách bên trái theo tab + filter realtime
    const canvasItems = canvasSidebarTab === "workflows" ? workflows : agents;
    const canvasQuery = canvasFilter.trim().toLowerCase();
    const filteredCanvasItems = canvasItems.filter(
        (item) => !canvasQuery || (item.name || "").toLowerCase().includes(canvasQuery),
    );

    // Tự mở file đầu tiên khi vào tab Changes
    useEffect(() => {
        if (activeSubView !== "changes") return;
        if (!changedFiles.length) {
            setChangeFile(null);
            setChangeContent("");
            return;
        }
        if (!changeFile || !changedFiles.some((file) => file.id === changeFile.id)) {
            handleSelectChangeFile(changedFiles[0]);
        }
    }, [activeSubView, changedFiles, changeFile, handleSelectChangeFile]);

    // Đóng popup/picker khi đổi tab hoặc đổi conversation
    useEffect(() => {
        setExpandedTool(null);
        setIsToolsPopupOpen(false);
        setPickerQuery("");
    }, [activeSubView, activeConversationId]);

    // Focus vào ô filter mỗi khi mở picker (autoFocus bị nút "+" lấy lại)
    useEffect(() => {
        if (!expandedTool) return undefined;
        const timer = window.setTimeout(() => pickerInputRef.current?.focus(), 40);
        return () => window.clearTimeout(timer);
    }, [expandedTool]);

    // Click ra vùng trống ngoài menu/picker/flyout thì đóng lại
    useEffect(() => {
        if (!isConvoListOpen && !isToolsPopupOpen && !isFilesMenuOpen && !expandedTool) {
            return undefined;
        }
        const handlePointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            if (
                isConvoListOpen &&
                !target.closest(".wb-convo-flyout-card") &&
                !target.closest(".btn-convo-dropdown")
            ) {
                setIsConvoListOpen(false);
            }
            if (
                isFilesMenuOpen &&
                !target.closest(".wb-files-dropdown-menu") &&
                !target.closest(".wb-pane-more-relative")
            ) {
                setIsFilesMenuOpen(false);
            }
            if (
                isToolsPopupOpen &&
                !target.closest(".prompt-tools-popup-menu") &&
                !target.closest(".btn-plus-tool-circle")
            ) {
                setIsToolsPopupOpen(false);
            }
            if (
                expandedTool &&
                !target.closest(".composer-picker-card") &&
                !target.closest(".prompt-tools-popup-menu") &&
                !target.closest(".btn-plus-tool-circle")
            ) {
                setExpandedTool(null);
                setPickerQuery("");
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [isConvoListOpen, isToolsPopupOpen, isFilesMenuOpen, expandedTool]);

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
                <div
                    className="workbench-three-col-layout"
                    style={{
                        gridTemplateColumns: `${filesWidth}px 3px minmax(0, 1fr) 3px ${chatWidth}px`,
                    }}
                >
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
                                {filesLoading && (
                                    <span className="wb-syncing-pill">
                                        <RefreshCw size={11} className="wb-spin" />
                                        <span>Syncing</span>
                                    </span>
                                )}

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
                                            <button
                                                type="button"
                                                className="dropdown-menu-item with-caption"
                                                onClick={() => {
                                                    setIsFilesMenuOpen(false);
                                                    handleSyncToFolder();
                                                }}
                                            >
                                                <div className="item-title-row">
                                                    <FolderSync size={14} />
                                                    <span>Sync to local folder</span>
                                                </div>
                                                <small>
                                                    Picks a folder from your machine and uploads
                                                    every text file into this workspace.
                                                </small>
                                            </button>
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
                                portal
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

                    {/* Tay nầm kéo giãn cột Files ↔ Editor */}
                    <div
                        className="wb-col-resizer"
                        role="separator"
                        aria-orientation="vertical"
                        title="Drag to resize"
                        onPointerDown={startResize("files")}
                    />

                    {/* CỘT 2: EDITOR VIEWPORT */}
                    <div className="wb-column-editor-pane">
                        <div className="wb-pane-header-row">
                            <div className="wb-pane-title-group">
                                {activeFile?.name === ".gitignore" ? (
                                    <GitMarkIcon size={14} />
                                ) : (
                                    <SplitSquareVertical size={14} />
                                )}
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
                                <div className="wb-editor-body">
                                    <div
                                        className="wb-code-gutter"
                                        ref={gutterRef}
                                        aria-hidden="true"
                                    >
                                        {Array.from({ length: draftLineCount }, (_, index) => (
                                            <span key={index}>{index + 1}</span>
                                        ))}
                                    </div>
                                    <div className="wb-code-layer">
                                        <pre
                                            className="wb-code-highlight"
                                            ref={preRef}
                                            aria-hidden="true"
                                        >
                                            <code
                                                dangerouslySetInnerHTML={{
                                                    __html: `${highlightedCode}\n`,
                                                }}
                                            />
                                        </pre>
                                        <textarea
                                            className="wb-editor-textarea"
                                            spellCheck={false}
                                            wrap="off"
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            onScroll={handleEditorScroll}
                                            onKeyDown={(event) => {
                                                if (
                                                    (event.ctrlKey || event.metaKey) &&
                                                    event.key === "s"
                                                ) {
                                                    event.preventDefault();
                                                    handleSaveFile();
                                                    return;
                                                }
                                                // Tab chèn 2 space thay vì đổi focus
                                                if (event.key === "Tab") {
                                                    event.preventDefault();
                                                    const el = event.target;
                                                    const start = el.selectionStart;
                                                    const end = el.selectionEnd;
                                                    const next = `${draft.slice(0, start)}  ${draft.slice(end)}`;
                                                    setDraft(next);
                                                    requestAnimationFrame(() => {
                                                        el.selectionStart = start + 2;
                                                        el.selectionEnd = start + 2;
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="wb-editor-statusbar">
                                    <span>
                                        {draftLineCount} lines ·{" "}
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

                    {/* Tay nầm kéo giãn cột Editor ↔ Chat */}
                    <div
                        className="wb-col-resizer"
                        role="separator"
                        aria-orientation="vertical"
                        title="Drag to resize"
                        onPointerDown={startResize("chat")}
                    />

                    {/* CỘT 3: CHAT CONTROLS */}
                    <div className="wb-column-chat-pane">
                        <div className="wb-pane-header-row wb-chat-header-row">
                            <div className="wb-chat-header-left">
                                <button
                                    type="button"
                                    className={`wb-convo-icon-btn ${
                                        isConvoListOpen ? "open" : ""
                                    }`}
                                    onClick={() => setIsConvoListOpen((prev) => !prev)}
                                    title="Conversations"
                                >
                                    <MessageCircleMore size={15} />
                                </button>
                                {activeConversationId &&
                                    messages.length > 0 &&
                                    activeConversation?.title && (
                                        <span className="wb-chat-title">
                                            {activeConversation.title}
                                        </span>
                                    )}
                            </div>

                            <div className="wb-header-right-controls">
                                <button
                                    type="button"
                                    className="btn-icon-ghost"
                                    title="Open this conversation in the Chat tab"
                                    onClick={() => onSubViewChange?.("chat")}
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


                        <div className="wb-chat-middle-content">
                            {messages.length ? (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`wb-chat-bubble ${message.role === "USER" ? "user" : "assistant"}`}
                                    >
                                        <div className="wb-chat-bubble-body">{message.content}</div>
                                        <div className="wb-chat-bubble-meta">
                                            <span className="bubble-role">
                                                {message.role === "USER" ? "You" : "Assistant"}
                                            </span>
                                            <span className="bubble-time">
                                                {formatRelative(message.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <ChatWelcome
                                    userName={firstName}
                                    disabled={sending || creatingConvo}
                                    onPick={handleSuggestionPick}
                                />
                            )}
                        </div>

                        {/* Thanh Prompt Input dưới đáy */}
                        <div className="wb-chat-prompt-footer">
                            {expandedTool && pickerMeta && (
                                <div
                                    className="composer-picker-card"
                                    onKeyDown={(event) => {
                                        if (event.key === "Escape") {
                                            setExpandedTool(null);
                                            setPickerQuery("");
                                        }
                                    }}
                                >
                                    <div className="composer-picker-search">
                                        <Search size={13} />
                                        <input
                                            ref={pickerInputRef}
                                            className="composer-picker-input"
                                            placeholder={pickerMeta.title}
                                            value={pickerQuery}
                                            onChange={(event) => setPickerQuery(event.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="composer-picker-close"
                                            title="Close picker"
                                            onClick={() => {
                                                setExpandedTool(null);
                                                setPickerQuery("");
                                            }}
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                    <div className="composer-picker-hint">{pickerMeta.hint}</div>
                                    <div className="composer-picker-list">
                                        {filteredPickerItems.length ? (
                                            filteredPickerItems.map((item) => {
                                                const ItemIcon = canvasIconFor(item);
                                                const isActive =
                                                    (expandedTool === "agent" &&
                                                        (settings?.agentId || "") === item.value) ||
                                                    (expandedTool === "skill" &&
                                                        selectedSkill === item.value) ||
                                                    (expandedTool === "workflow" &&
                                                        (settings?.workflowId || "") === item.value);
                                                return (
                                                    <button
                                                        key={`${expandedTool}-${item.value}`}
                                                        type="button"
                                                        className={`composer-picker-item ${
                                                            isActive ? "active" : ""
                                                        }`}
                                                        onClick={() => choosePickerItem(item)}
                                                    >
                                                        <span
                                                            className="composer-picker-icon"
                                                            style={{
                                                                color:
                                                                    item.color || "var(--accent)",
                                                            }}
                                                        >
                                                            <ItemIcon size={15} />
                                                        </span>
                                                        <span className="composer-picker-body">
                                                            <span className="composer-picker-title">
                                                                <strong>{item.label}</strong>
                                                                <span className="composer-picker-badge">
                                                                    by VibeFlow
                                                                </span>
                                                            </span>
                                                            {item.description && (
                                                                <span className="composer-picker-desc">
                                                                    {item.description}
                                                                </span>
                                                            )}
                                                            {item.example && (
                                                                <em className="composer-picker-eg">
                                                                    {item.example}
                                                                </em>
                                                            )}
                                                        </span>
                                                        {isActive && <Check size={14} />}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="composer-picker-empty">
                                                {pickerMeta.empty}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="prompt-input-surface-box">
                                <textarea
                                    className="wb-prompt-textarea"
                                    placeholder="Type a prompt… (! agents, / skills, # workflows, @ files, ↑ history, ? help)"
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
                                            className={`btn-plus-tool-circle ${
                                                isToolsPopupOpen || expandedTool ? "open" : ""
                                            }`}
                                            onClick={() => {
                                                setExpandedTool(null);
                                                setIsToolsPopupOpen((prev) => !prev);
                                            }}
                                            title="Tools"
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
                                                    <Paperclip size={14} className="tool-ic ic-muted" />
                                                    <span>Add files or photos</span>
                                                    <kbd>Ctrl+Shift+A</kbd>
                                                </button>

                                                <div className="tool-menu-divider" />

                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() => openPicker("agent")}
                                                >
                                                    <Bot size={14} className="tool-ic ic-accent" />
                                                    <span>Agent</span>
                                                    <span className="tool-menu-val muted">
                                                        {selectedAgentName}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() => openPicker("skill")}
                                                >
                                                    <Sparkles
                                                        size={14}
                                                        className="tool-ic ic-violet"
                                                    />
                                                    <span>Skill</span>
                                                    <span className="tool-menu-val muted">
                                                        {selectedSkill}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() => openPicker("workflow")}
                                                >
                                                    <GitBranch size={14} className="tool-ic ic-info" />
                                                    <span>Workflow</span>
                                                    <span className="tool-menu-val muted">
                                                        {selectedWorkflowName}
                                                    </span>
                                                </button>

                                                <div className="tool-menu-divider" />

                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() => {
                                                        setIsToolsPopupOpen(false);
                                                        handleReloadSettings();
                                                    }}
                                                >
                                                    <RotateCw size={14} className="tool-ic ic-muted" />
                                                    <span>Reload models, skills &amp; agents</span>
                                                </button>

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
                                                    <Zap size={14} className="tool-ic ic-muted" />
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
                                                    <EyeOff size={14} className="tool-ic ic-muted" />
                                                    <span>Hide Thinking</span>
                                                    <span className="tool-menu-val">
                                                        {settings?.hideThinking ? "ON" : "OFF"}
                                                    </span>
                                                </button>

                                                <div className="tool-menu-divider" />

                                                <button
                                                    type="button"
                                                    className="tool-menu-row"
                                                    onClick={() => {
                                                        setIsToolsPopupOpen(false);
                                                        handleDownloadLocalTranscript();
                                                    }}
                                                >
                                                    <Download size={14} className="tool-ic ic-muted" />
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
                                            portal
                                        />
                                        <button
                                            type="button"
                                            className={`btn-send-message ${
                                                prompt.trim() ? "enabled" : ""
                                            }`}
                                            disabled={!prompt.trim() || sending}
                                            onClick={() => handleSendPrompt()}
                                            title="Send (Enter)"
                                        >
                                            {sending ? (
                                                <Loader2 size={13} className="wb-spin" />
                                            ) : (
                                                <ArrowUp size={14} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="wb-chat-status-line">
                                <span className="wb-online-dot" />
                                <span className="status-online">Online</span>
                                <span className="status-sep">·</span>
                                <span className="disclaimer">
                                    {activeConversation?.model || "No model selected"} · AI can
                                    make mistakes. Review the results carefully.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* ======================================================== */}
            {/* VIEW B: CANVAS (WORKFLOW / AGENT BOARD)                  */}
            {/* ======================================================== */}
            {activeSubView === "canvas" && (
                <div className="wb-canvas-page">
                    <aside className="wb-canvas-rail">
                        <div className="wb-canvas-tabs">
                            <button
                                type="button"
                                className={`wb-canvas-tab ${
                                    canvasSidebarTab === "workflows" ? "active" : ""
                                }`}
                                onClick={() => setCanvasSidebarTab("workflows")}
                            >
                                WORKFLOWS
                            </button>
                            <button
                                type="button"
                                className={`wb-canvas-tab ${
                                    canvasSidebarTab === "agents" ? "active" : ""
                                }`}
                                onClick={() => setCanvasSidebarTab("agents")}
                            >
                                AGENTS
                            </button>
                        </div>

                        <div className="wb-canvas-filter">
                            <Search size={13} />
                            <input
                                type="text"
                                placeholder="Filter…"
                                value={canvasFilter}
                                onChange={(event) => setCanvasFilter(event.target.value)}
                            />
                        </div>

                        <div className="wb-canvas-list">
                            <span className="wb-canvas-group-label">BUILT-IN</span>
                            {filteredCanvasItems.length ? (
                                filteredCanvasItems.map((item) => {
                                    const ItemIcon = canvasIconFor({
                                        ...item,
                                        kind: canvasSidebarTab,
                                    });
                                    const stepCount = String(item.stepsSummary || "")
                                        .split("→")
                                        .filter(Boolean).length;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`wb-canvas-item ${
                                                selectedWorkflowId === item.id ? "active" : ""
                                            }`}
                                            style={{
                                                "--item-color": item.color || "var(--accent)",
                                            }}
                                            draggable
                                            onDragStart={(event) =>
                                                handleCanvasDragStart(event, item)
                                            }
                                            onClick={() => handleCanvasAdd(item)}
                                            title={`Drag ${item.name} onto the grid`}
                                        >
                                            <span className="wb-canvas-item-strip" />
                                            <span className="wb-canvas-item-icon">
                                                <ItemIcon size={14} />
                                            </span>
                                            <span className="wb-canvas-item-body">
                                                <strong>{item.name}</strong>
                                                <small>
                                                    {canvasSidebarTab === "workflows"
                                                        ? `${stepCount} nodes`
                                                        : item.type === "BUILT_IN"
                                                          ? "built-in agent"
                                                          : "project agent"}
                                                </small>
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="wb-canvas-empty">
                                    No {canvasSidebarTab} match “{canvasFilter}”.
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="wb-canvas-stage">
                        <div className="wb-canvas-topbar">
                            <div className="wb-canvas-status">
                                <span
                                    className={`wb-canvas-dot ${
                                        canvasNodes.length ? "live" : ""
                                    }`}
                                />
                                <strong>
                                    {canvasNodes.length
                                        ? `${canvasNodes.length} item${
                                              canvasNodes.length > 1 ? "s" : ""
                                          } on canvas`
                                        : "Drag a workflow onto the grid"}
                                </strong>
                            </div>
                            <div className="wb-canvas-actions">
                                <span className="wb-canvas-zoom-val">
                                    {Math.round(canvasZoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    className="btn-wb-mini"
                                    onClick={() => onOpenWorkflows?.()}
                                    title="Open the Workflows tab to edit steps"
                                >
                                    <PanelsTopLeft size={12} />
                                    <span>Open in Workflows</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-wb-mini primary"
                                    onClick={() => setCanvasNodes([])}
                                    disabled={!canvasNodes.length}
                                >
                                    <Trash2 size={12} />
                                    <span>Clear</span>
                                </button>
                            </div>
                        </div>

                        <div
                            ref={canvasGridRef}
                            className={`wb-canvas-grid ${canvasDragOver ? "drop-active" : ""}`}
                            style={{ backgroundSize: `${22 * canvasZoom}px ${22 * canvasZoom}px` }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setCanvasDragOver(true);
                            }}
                            onDragLeave={() => setCanvasDragOver(false)}
                            onDrop={handleCanvasDrop}
                        >
                            <div
                                className="wb-canvas-world"
                                style={{ transform: `scale(${canvasZoom})` }}
                            >
                                {canvasNodes.length ? (
                                    canvasNodes.map((node) => {
                                        const NodeIcon = canvasIconFor(node);
                                        const steps = String(node.stepsSummary || "")
                                            .split("→")
                                            .map((step) => step.trim())
                                            .filter(Boolean);
                                        return (
                                            <div
                                                key={node.key}
                                                className="wb-canvas-node"
                                                style={{
                                                    left: `${node.x}px`,
                                                    top: `${node.y}px`,
                                                    "--node-color":
                                                        node.color || "var(--accent)",
                                                }}
                                            >
                                                <div className="wb-canvas-node-head">
                                                    <span className="wb-canvas-node-icon">
                                                        <NodeIcon size={13} />
                                                    </span>
                                                    <strong>{node.name}</strong>
                                                    <button
                                                        type="button"
                                                        className="wb-canvas-node-remove"
                                                        title="Remove from canvas"
                                                        onClick={() =>
                                                            setCanvasNodes((prev) =>
                                                                prev.filter(
                                                                    (item) =>
                                                                        item.key !== node.key,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                                <div className="wb-canvas-node-meta">
                                                    <span>
                                                        {node.kind === "agents"
                                                            ? "agent"
                                                            : "workflow"}
                                                    </span>
                                                    {node.type ? (
                                                        <span>
                                                            ·{" "}
                                                            {node.type === "BUILT_IN"
                                                                ? "built-in"
                                                                : "project"}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {steps.length > 0 ? (
                                                    <div className="wb-canvas-node-steps">
                                                        {steps.slice(0, 4).map((step, index) => (
                                                            <span key={`${node.key}-${index}`}>
                                                                {step}
                                                            </span>
                                                        ))}
                                                        {steps.length > 4 && (
                                                            <span>+{steps.length - 4}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    node.role && (
                                                        <p className="wb-canvas-node-role">
                                                            {node.role}
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="wb-canvas-hint">
                                        <Layers size={26} />
                                        <span>Drop a workflow or agent here.</span>
                                        <small>
                                            Hover an item on the left, then drag it onto the grid.
                                        </small>
                                    </div>
                                )}
                            </div>

                            <div className="wb-canvas-tools">
                                <button
                                    type="button"
                                    title="Zoom in"
                                    onClick={() =>
                                        setCanvasZoom((zoom) =>
                                            Math.min(1.6, Number((zoom + 0.1).toFixed(2))),
                                        )
                                    }
                                >
                                    <ZoomIn size={14} />
                                </button>
                                <button
                                    type="button"
                                    title="Zoom out"
                                    onClick={() =>
                                        setCanvasZoom((zoom) =>
                                            Math.max(0.5, Number((zoom - 0.1).toFixed(2))),
                                        )
                                    }
                                >
                                    <ZoomOut size={14} />
                                </button>
                                <button
                                    type="button"
                                    title="Reset zoom"
                                    onClick={() => setCanvasZoom(1)}
                                >
                                    <RotateCcw size={13} />
                                </button>
                                <button
                                    type="button"
                                    className="danger"
                                    title="Clear canvas"
                                    onClick={() => setCanvasNodes([])}
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>

                        {messages.length > 0 && (
                            <div className="wb-canvas-messages">
                                <span className="wb-canvas-messages-title">
                                    <MessageSquare size={12} />
                                    Messages
                                    <span>{messages.length}</span>
                                </span>
                                <p>{messages[messages.length - 1]?.content}</p>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW D: CHANGES (FILES CHANGED + DIFF VIEWER)            */}
            {/* ======================================================== */}
            {activeSubView === "changes" && (
                <div className="wb-changes-page">
                    <aside className="wb-changes-files-pane">
                        <div className="wb-changes-pane-head">
                            <div className="wb-pane-title-group">
                                <GitCompare size={14} />
                                <strong>Files changed</strong>
                                <span className="wb-changes-ratio">
                                    {changedFiles.length}/{changedFiles.length}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="btn-icon-ghost"
                                title="Refresh"
                                onClick={() => loadFiles()}
                            >
                                <RefreshCw size={13} />
                            </button>
                        </div>

                        <div className="wb-changes-filter-row">
                            <span className="wb-changes-filter-pill">All</span>
                            <span className="wb-diffstat-add">+{changesAddTotal}</span>
                            <span className="wb-diffstat-del">−0</span>
                        </div>

                        <div className="wb-changes-file-list">
                            {changedFiles.length ? (
                                changedFiles.map((file) => (
                                    <button
                                        key={file.id}
                                        type="button"
                                        className={`wb-changes-file ${
                                            changeFile?.id === file.id ? "active" : ""
                                        }`}
                                        onClick={() => handleSelectChangeFile(file)}
                                        title={file.path}
                                    >
                                        <CheckCircle2
                                            size={13}
                                            className="wb-change-check"
                                            aria-hidden="true"
                                        />
                                        <span className="wb-change-badge">M</span>
                                        <span className="wb-change-path">{file.path}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="wb-changes-empty">
                                    <GitCompare size={22} />
                                    <span>No local changes yet</span>
                                    <small>Files you edit in the IDE show up here.</small>
                                </div>
                            )}
                        </div>

                        <div className="wb-changes-pane-foot">
                            <button
                                type="button"
                                className="btn-wb-mini"
                                onClick={handleDownloadWorkspace}
                            >
                                <Download size={12} />
                                <span>Download workspace</span>
                            </button>
                        </div>
                    </aside>

                    <section className="wb-diff-pane">
                        <div className="wb-diff-head">
                            <div className="wb-pane-title-group">
                                <FileText size={14} />
                                <span className="wb-diff-path">
                                    {changeFile?.path || "Select a file to view its changes"}
                                </span>
                            </div>
                            <div className="wb-header-right-controls">
                                {changeFile && (
                                    <>
                                        <span className="wb-diffstat-add">
                                            +{changeFile.lineCount || changeLines.length}
                                        </span>
                                        <span className="wb-diffstat-del">−0</span>
                                        <button
                                            type="button"
                                            className="btn-wb-mini"
                                            onClick={() => handleOpenFileFromView(changeFile)}
                                        >
                                            <Pencil size={12} />
                                            <span>Edit</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="wb-diff-body">
                            {changeLoading ? (
                                <div className="wb-view-empty-stage">
                                    <Loader2 size={22} className="wb-spin" />
                                    <span>Loading diff…</span>
                                </div>
                            ) : changeFile ? (
                                <>
                                    <div className="wb-diff-fileheader">
                                        <span className="wb-diff-hunk">
                                            @@ {changeFile.path} @@
                                        </span>
                                        <span className="wb-diff-filemeta">
                                            {changeFile.language} ·{" "}
                                            {formatBytes(changeFile.sizeBytes)} · edited{" "}
                                            {formatRelative(changeFile.updatedAt)}
                                        </span>
                                    </div>
                                    <div className="wb-diff-lines">
                                        {changeLines.map((line, index) => (
                                            <div
                                                key={`diff-${index}`}
                                                className="wb-diff-line added"
                                            >
                                                <span className="wb-diff-ln">{index + 1}</span>
                                                <span className="wb-diff-sign">+</span>
                                                <code>{line || " "}</code>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="wb-view-empty-stage">
                                    <GitCompare size={30} />
                                    <span>Pick a file to see its changes</span>
                                    <small>
                                        Every file you edited in the IDE is listed on the left.
                                    </small>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* VIEW E: GALAXY (BẢN ĐỒ CHÒM SAO CỦA WORKSPACE)           */}
            {/* ======================================================== */}
            {activeSubView === "galaxy" && (
                <div className="workbench-galaxy-layout">
                    <div className="wb-galaxy-header">
                        <div className="wb-changes-title-group">
                            <Orbit size={14} />
                            <strong>Galaxy</strong>
                            <span className="wb-changes-count">
                                {files.length} file(s) · click a star to open it in the IDE
                            </span>
                        </div>
                        <div className="wb-header-right-controls">
                            <span className="wb-galaxy-legend">
                                <i className="legend-dot edited" /> edited by you
                            </span>
                        </div>
                    </div>
                    <div className="wb-galaxy-stage">
                        {files.length ? (
                            <WorkbenchGalaxy
                                files={files}
                                onOpenFile={handleOpenFileFromView}
                            />
                        ) : (
                            <div className="wb-view-empty-stage">
                                <Orbit size={30} />
                                <span>Nothing to map yet</span>
                                <small>Upload files or sync a folder to see the galaxy.</small>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* ======================================================== */}
            {/* VIEW F: PREVIEW (RENDER MARKDOWN / APP PREVIEW STAGE)    */}
            {/* ======================================================== */}
            {activeSubView === "preview" && (
                <div className="wb-preview-page">
                    <aside className="wb-preview-rail">
                        <div className="wb-rail-header-row">
                            <BookOpen size={14} />
                            <strong>Markdown</strong>
                            <span className="wb-rail-count">{markdownFiles.length}</span>
                        </div>
                        <div className="wb-rail-list">
                            {markdownFiles.length ? (
                                markdownFiles.map((file) => (
                                    <button
                                        key={file.id}
                                        type="button"
                                        className={`wb-preview-item ${
                                            previewFile?.id === file.id ? "active" : ""
                                        }`}
                                        onClick={() => handlePreviewFile(file)}
                                        title={file.path}
                                    >
                                        <FileText size={13} />
                                        <span>{file.name}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="convo-empty-text">
                                    No markdown files in this workspace yet.
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="wb-preview-stage">
                        <div className="wb-preview-topbar">
                            <div className="wb-pane-title-group">
                                <Globe size={14} />
                                <strong>{previewFile?.name || "Preview"}</strong>
                            </div>
                            <div className="wb-header-right-controls">
                                {previewFile && (
                                    <>
                                        <button
                                            type="button"
                                            className={`wb-preview-tab ${
                                                previewRaw ? "" : "active"
                                            }`}
                                            onClick={() => setPreviewRaw(false)}
                                        >
                                            Preview
                                        </button>
                                        <button
                                            type="button"
                                            className={`wb-preview-tab ${
                                                previewRaw ? "active" : ""
                                            }`}
                                            onClick={() => setPreviewRaw(true)}
                                        >
                                            Raw
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-wb-mini"
                                            onClick={() => handleOpenFileFromView(previewFile)}
                                        >
                                            <Pencil size={12} />
                                            <span>Edit</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="wb-preview-body">
                            {previewLoading ? (
                                <div className="wb-view-empty-stage">
                                    <Loader2 size={24} className="wb-spin" />
                                    <span>Loading file…</span>
                                </div>
                            ) : previewFile && !previewRaw ? (
                                <div
                                    className="wb-md-render"
                                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                                />
                            ) : previewFile && previewRaw ? (
                                <pre className="wb-md-raw">{previewFile.content}</pre>
                            ) : (
                                <div className="wb-preview-empty">
                                    <Globe size={44} className="wb-preview-globe" />
                                    <strong>No running apps detected</strong>
                                    <button
                                        type="button"
                                        className="btn-preview-run"
                                        onClick={handleRunPreview}
                                    >
                                        <Play size={13} />
                                        <span>Run App</span>
                                    </button>
                                    <p>
                                        Renders markdown from this workspace. Pick a file on the
                                        left, or run the app to preview it here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
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
