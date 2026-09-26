import { useState, useRef, useEffect } from "react";
import {
    ArrowRight,
    Bot,
    Check,
    Clock,
    Code2,
    Copy,
    CornerDownLeft,
    Database,
    FileSpreadsheet,
    FileText,
    FileType,
    GraduationCap,
    Library,
    MessageSquare,
    MoreHorizontal,
    Paperclip,
    Plus,
    Presentation,
    RotateCcw,
    Search,
    Sparkles,
    Trash2,
    UploadCloud,
    User,
    X,
} from "lucide-react";
import "./Conversation.css";

// Dữ liệu tài liệu mặc định nếu localStorage chưa khởi tạo
const DEFAULT_GLOBAL_DOCS = [
    {
        id: "doc-1",
        title: "Lecture_04_Dynamic_Programming.pdf",
        type: "pdf",
        size: "3.8 MB",
        uploadedAt: "Yesterday, 14:20",
        chunks: 142,
        courseCode: "CS204",
    },
    {
        id: "doc-2",
        title: "Clean_Architecture_Domain_Guidelines.docx",
        type: "docx",
        size: "1.4 MB",
        uploadedAt: "3 days ago",
        chunks: 86,
        courseCode: "SE301",
    },
    {
        id: "doc-3",
        title: "Benchmark_Retrieval_Vector_Latency.xlsx",
        type: "xlsx",
        size: "620 KB",
        uploadedAt: "1 week ago",
        chunks: 48,
        courseCode: "AI402",
    },
    {
        id: "doc-4",
        title: "Microservices_Event_Driven_Patterns.pptx",
        type: "pptx",
        size: "8.5 MB",
        uploadedAt: "Sep 20, 2026",
        chunks: 110,
        courseCode: "SE301",
    },
    {
        id: "doc-5",
        title: "GraphRAG_KnowledgeGraph_Spec.md",
        type: "md",
        size: "94 KB",
        uploadedAt: "Sep 18, 2026",
        chunks: 24,
        courseCode: "AI402",
    },
];

const MOCK_SESSIONS = [
    {
        id: "sess-1",
        title: "Dijkstra PriorityQueue optimization inquiry",
        preview: "Because Java PriorityQueue does not support decreaseKey...",
        time: "10:24 AM",
        timeGroup: "Today",
        tool: "tutor",
        toolName: "Socratic Tutor",
        courseCode: "CS204",
        messages: [
            {
                id: "m1",
                role: "user",
                text: "Why do we need `if (d > dist[u]) continue;` in Dijkstra if we already use a PriorityQueue?",
                timestamp: "10:22 AM",
            },
            {
                id: "m2",
                role: "assistant",
                text: "Great question! Standard Java `PriorityQueue` does not support an efficient `decreaseKey` operation ($O(\\log V)$). When a shorter path to a vertex $u$ is discovered, a duplicate pair `(u, new_dist)` is simply pushed into the queue.\n\nWithout `if (d > dist[u]) continue;`, older, stale entries with larger distances would still trigger edge relaxations, leading to $O(V \\cdot E)$ degradation instead of the optimal $O(E \\log V)$.",
                timestamp: "10:23 AM",
                citation: "CS204: Lecture_04_Graph_Algorithms.pdf (Page 14)",
                codeSnippet: `// Skip stale queue entries\nif (d > dist[u]) {\n    continue;\n}`,
            },
            {
                id: "m3",
                role: "user",
                text: "Got it! So this is effectively a lazy deletion pattern?",
                timestamp: "10:24 AM",
            },
            {
                id: "m4",
                role: "assistant",
                text: "Exactly. It is known as 'lazy deletion' or 'tombstone skipping', keeping priority queue operations simple without custom indexed binary heaps.",
                timestamp: "10:24 AM",
            },
        ],
    },
];

const Conversation = () => {
    const [sessions, setSessions] = useState(MOCK_SESSIONS);
    const [activeSessionId, setActiveSessionId] = useState(MOCK_SESSIONS[0].id);
    const [searchQuery, setSearchQuery] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [copiedSnippetId, setCopiedSnippetId] = useState(null);

    // State quản lý tài liệu đính kèm & Modal Upload
    const [attachedDocs, setAttachedDocs] = useState([]); // File gắn vào prompt hiện tại
    const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
    const [modalSubTab, setModalSubTab] = useState("existing"); // 'existing' | 'upload_new'
    const [docSearchKeyword, setDocSearchKeyword] = useState("");
    const [globalDocuments, setGlobalDocuments] = useState([]);
    const fileDeviceInputRef = useRef(null);

    // Đồng bộ danh sách tài liệu với localStorage
    useEffect(() => {
        const saved = localStorage.getItem("academy_hub_documents");
        if (saved) {
            try {
                setGlobalDocuments(JSON.parse(saved));
            } catch {
                setGlobalDocuments(DEFAULT_GLOBAL_DOCS);
            }
        } else {
            setGlobalDocuments(DEFAULT_GLOBAL_DOCS);
            localStorage.setItem("academy_hub_documents", JSON.stringify(DEFAULT_GLOBAL_DOCS));
        }
    }, []);

    const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

    const filteredSessions = sessions.filter(
        (s) =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.courseCode.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const getDocIcon = (type) => {
        switch (type) {
            case "pdf":
                return <FileText size={15} className="file-icon-pdf" />;
            case "docx":
            case "doc":
                return <FileType size={15} className="file-icon-docx" />;
            case "xlsx":
            case "csv":
                return <FileSpreadsheet size={15} className="file-icon-xlsx" />;
            case "pptx":
                return <Presentation size={15} className="file-icon-pptx" />;
            default:
                return <FileText size={15} className="file-icon-default" />;
        }
    };

    // Chọn tài liệu đã có trong kho
    const handleToggleSelectExisting = (doc) => {
        const exists = attachedDocs.some((d) => d.id === doc.id);
        if (exists) {
            setAttachedDocs(attachedDocs.filter((d) => d.id !== doc.id));
        } else {
            setAttachedDocs([...attachedDocs, doc]);
        }
    };

    // Upload file mới từ máy tính: Lưu vào kho localStorage và gắn vào chat
    const handleDeviceFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split(".").pop().toLowerCase();
        const newUploadedDoc = {
            id: `doc-${Date.now()}`,
            title: file.name,
            type: ext,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            uploadedAt: "Just now",
            chunks: Math.floor(Math.random() * 60) + 15,
            courseCode: activeSession?.courseCode || "GEN",
        };

        const updatedDocs = [newUploadedDoc, ...globalDocuments];
        setGlobalDocuments(updatedDocs);
        localStorage.setItem("academy_hub_documents", JSON.stringify(updatedDocs));

        // Tự động gắn vào danh sách đính kèm của prompt
        setAttachedDocs((prev) => [...prev, newUploadedDoc]);
        setIsAttachModalOpen(false);
    };

    const handleCreateNewChat = () => {
        const newId = `sess-${Date.now()}`;
        const newSession = {
            id: newId,
            title: "New AI Tutoring Session",
            preview: "Ask anything about algorithms, courseware, or exam preparation...",
            time: "Just now",
            timeGroup: "Today",
            tool: "tutor",
            toolName: "Socratic Tutor",
            courseCode: "GENERAL",
            messages: [
                {
                    id: `m-${Date.now()}`,
                    role: "assistant",
                    text: "Hello Huy! I'm your AI Academic Companion. What concept or problem would you like to explore today?",
                    timestamp: "Just now",
                },
            ],
        };
        setSessions([newSession, ...sessions]);
        setActiveSessionId(newId);
    };

    const handleDeleteSession = (e, id) => {
        e.stopPropagation();
        const updated = sessions.filter((s) => s.id !== id);
        setSessions(updated);
        if (activeSessionId === id && updated.length > 0) {
            setActiveSessionId(updated[0].id);
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim() || !activeSession) return;

        const docCitations = attachedDocs.map((d) => d.title).join(", ");
        const userMsg = {
            id: `usr-${Date.now()}`,
            role: "user",
            text: newMessage,
            timestamp: "Just now",
            attachedFiles: [...attachedDocs],
        };

        const aiMsg = {
            id: `ai-${Date.now()}`,
            role: "assistant",
            text: docCitations
                ? `I have referenced the context from **${docCitations}**.\n\nRegarding your question: "${newMessage}" — Here is the Socratic step-by-step breakdown based on the retrieved vector embeddings.`
                : `Analyzing: "${newMessage}". Let's break this down systematically according to your curriculum standards.`,
            timestamp: "Just now",
            citation: docCitations ? `RAG Sources: ${docCitations}` : null,
        };

        const updatedSessions = sessions.map((s) => {
            if (s.id === activeSession.id) {
                return {
                    ...s,
                    preview: newMessage,
                    time: "Just now",
                    messages: [...s.messages, userMsg, aiMsg],
                };
            }
            return s;
        });

        setSessions(updatedSessions);
        setNewMessage("");
        setAttachedDocs([]); // Reset danh sách tệp đính kèm sau khi gửi
    };

    const handleCopyCode = (id, code) => {
        navigator.clipboard.writeText(code);
        setCopiedSnippetId(id);
        setTimeout(() => setCopiedSnippetId(null), 2000);
    };

    return (
        <div className="conversations-tab-bounds">
            {/* Header Banner */}
            <div className="conversations-header-banner">
                <div>
                    <h2>Conversations & Chat History</h2>
                    <span>
                        Review archived AI tutoring transcripts, Socratic inquiry logs, and RAG
                        knowledge inquiries
                    </span>
                </div>
                <button type="button" className="btn-new-chat" onClick={handleCreateNewChat}>
                    <Plus size={14} />
                    <span>New Tutoring Session</span>
                </button>
            </div>

            {/* Two-Column Chat Container */}
            <div className="conversations-split-grid">
                {/* CỘT TRÁI: DANH SÁCH LỊCH SỬ CHAT */}
                <aside className="chat-history-sidebar">
                    <div className="history-search-wrap">
                        <Search size={14} className="search-glyph" />
                        <input
                            type="text"
                            placeholder="Search conversation history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="history-scroll-list">
                        {filteredSessions.map((session) => {
                            const isSelected = activeSession?.id === session.id;
                            return (
                                <div
                                    key={session.id}
                                    className={`session-history-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => setActiveSessionId(session.id)}
                                >
                                    <div className="session-card-top">
                                        <span className="session-course-badge">
                                            {session.courseCode}
                                        </span>
                                        <span className="session-tool-tag">{session.toolName}</span>
                                        <button
                                            type="button"
                                            className="btn-delete-session"
                                            title="Delete conversation"
                                            onClick={(e) => handleDeleteSession(e, session.id)}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>

                                    <strong className="session-title-line" title={session.title}>
                                        {session.title}
                                    </strong>
                                    <p className="session-preview-line">{session.preview}</p>

                                    <div className="session-card-bottom">
                                        <span className="session-time-text">
                                            <Clock size={11} /> {session.time}
                                        </span>
                                        <span className="session-msg-count">
                                            {session.messages.length} msgs
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* CỘT PHẢI: KHUNG ĐOẠN CHAT CHI TIẾT */}
                <main className="chat-detail-viewport">
                    {activeSession ? (
                        <>
                            {/* Chat Header Bar */}
                            <div className="chat-viewport-header">
                                <div className="chat-topic-col">
                                    <div className="chat-topic-row">
                                        <span className="topic-course-badge">
                                            {activeSession.courseCode}
                                        </span>
                                        <strong>{activeSession.title}</strong>
                                    </div>
                                    <span className="chat-context-subtitle">
                                        Engine: {activeSession.toolName} •{" "}
                                        {activeSession.messages.length} exchanges
                                    </span>
                                </div>

                                <div className="chat-header-actions">
                                    <button
                                        type="button"
                                        className="btn-header-action"
                                        title="Clear and restart topic"
                                        onClick={handleCreateNewChat}
                                    >
                                        <RotateCcw size={13} />
                                        <span>Restart</span>
                                    </button>
                                </div>
                            </div>

                            {/* Chat Messages Stream */}
                            <div className="chat-stream-scroller">
                                {activeSession.messages.map((msg) => {
                                    const isAi = msg.role === "assistant";
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`message-exchange-bubble ${isAi ? "ai" : "user"}`}
                                        >
                                            <div className="msg-avatar-tag">
                                                {isAi ? <Bot size={15} /> : <User size={15} />}
                                            </div>

                                            <div className="msg-body-wrapper">
                                                <div className="msg-meta-row">
                                                    <span className="sender-name">
                                                        {isAi ? activeSession.toolName : "You"}
                                                    </span>
                                                    <span className="msg-timestamp">
                                                        {msg.timestamp}
                                                    </span>
                                                </div>

                                                {/* Hiển thị các file đính kèm kèm trong tin nhắn của User */}
                                                {msg.attachedFiles &&
                                                    msg.attachedFiles.length > 0 && (
                                                        <div className="msg-attached-files-row">
                                                            {msg.attachedFiles.map((file) => (
                                                                <div
                                                                    key={file.id}
                                                                    className="msg-attached-pill"
                                                                >
                                                                    {getDocIcon(file.type)}
                                                                    <span>{file.title}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                <div className="msg-text-content">
                                                    <p>{msg.text}</p>
                                                </div>

                                                {/* Code Snippet Box nếu có */}
                                                {msg.codeSnippet && (
                                                    <div className="chat-code-block">
                                                        <div className="code-block-bar">
                                                            <span>Java</span>
                                                            <button
                                                                type="button"
                                                                className="btn-copy-code"
                                                                onClick={() =>
                                                                    handleCopyCode(
                                                                        msg.id,
                                                                        msg.codeSnippet,
                                                                    )
                                                                }
                                                            >
                                                                {copiedSnippetId === msg.id ? (
                                                                    <>
                                                                        <Check
                                                                            size={12}
                                                                            color="#059669"
                                                                        />{" "}
                                                                        Copied
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy size={12} /> Copy
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <pre>
                                                            <code>{msg.codeSnippet}</code>
                                                        </pre>
                                                    </div>
                                                )}

                                                {/* Trích dẫn tài liệu giáo trình RAG */}
                                                {msg.citation && (
                                                    <div className="chat-rag-citation-box">
                                                        <Library size={12} color="#059669" />
                                                        <span>{msg.citation}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Input Prompt Dock */}
                            <div className="chat-prompt-dock">
                                {/* Khay hiển thị các file tài liệu đã đính kèm chuẩn bị gửi */}
                                {attachedDocs.length > 0 && (
                                    <div className="composer-attached-tray">
                                        {attachedDocs.map((doc) => (
                                            <div key={doc.id} className="composer-doc-chip">
                                                {getDocIcon(doc.type)}
                                                <span className="chip-name">{doc.title}</span>
                                                <button
                                                    type="button"
                                                    className="btn-remove-chip"
                                                    onClick={() =>
                                                        setAttachedDocs(
                                                            attachedDocs.filter(
                                                                (d) => d.id !== doc.id,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="prompt-input-surface">
                                    <textarea
                                        rows={2}
                                        placeholder={`Message ${activeSession.toolName}... (Press Enter to send, Shift+Enter for new line)`}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                    <div className="prompt-action-controls">
                                        <div className="controls-left-group">
                                            {/* Nút mở modal đính kèm tài liệu */}
                                            <button
                                                type="button"
                                                className="btn-attach-document"
                                                onClick={() => setIsAttachModalOpen(true)}
                                                title="Attach Document from Library or Device"
                                            >
                                                <Paperclip size={14} />
                                                <span>Attach Document</span>
                                            </button>
                                            <span className="prompt-hint-keys">
                                                Shift + Enter for new line
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-submit-prompt"
                                            disabled={
                                                !newMessage.trim() && attachedDocs.length === 0
                                            }
                                            onClick={handleSendMessage}
                                        >
                                            <CornerDownLeft size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <MessageSquare size={36} color="#cbd5e1" />
                            <p>
                                Select a conversation from the history or start a new tutoring
                                session
                            </p>
                        </div>
                    )}
                </main>
            </div>

            {/* MODAL: ATTACH DOCUMENT FROM TABS DOCUMENT OR UPLOAD NEW */}
            {isAttachModalOpen && (
                <div className="modal-backdrop-scrim" onClick={() => setIsAttachModalOpen(false)}>
                    <div className="attach-doc-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-bar">
                            <div className="modal-title-wrap">
                                <Library size={16} color="#059669" />
                                <strong>Attach Learning Documents to Chat</strong>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setIsAttachModalOpen(false)}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Tabs: Thư viện có sẵn vs Tải mới từ máy */}
                        <div className="modal-subnav-tabs">
                            <button
                                type="button"
                                className={`modal-tab-btn ${modalSubTab === "existing" ? "active" : ""}`}
                                onClick={() => setModalSubTab("existing")}
                            >
                                Existing Documents Tab ({globalDocuments.length})
                            </button>
                            <button
                                type="button"
                                className={`modal-tab-btn ${modalSubTab === "upload_new" ? "active" : ""}`}
                                onClick={() => setModalSubTab("upload_new")}
                            >
                                Upload New from Computer
                            </button>
                        </div>

                        {/* Nội dung Tab 1: Danh sách tài liệu có sẵn trong kho */}
                        {modalSubTab === "existing" ? (
                            <div className="modal-tab-body">
                                <div className="modal-search-field">
                                    <Search size={14} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search by title, syllabus code..."
                                        value={docSearchKeyword}
                                        onChange={(e) => setDocSearchKeyword(e.target.value)}
                                    />
                                </div>

                                <div className="modal-docs-list-scroller">
                                    {globalDocuments
                                        .filter((doc) =>
                                            doc.title
                                                .toLowerCase()
                                                .includes(docSearchKeyword.toLowerCase()),
                                        )
                                        .map((doc) => {
                                            const isSelected = attachedDocs.some(
                                                (d) => d.id === doc.id,
                                            );
                                            return (
                                                <div
                                                    key={doc.id}
                                                    className={`doc-selection-row ${isSelected ? "selected" : ""}`}
                                                    onClick={() => handleToggleSelectExisting(doc)}
                                                >
                                                    <div className="doc-select-info">
                                                        {getDocIcon(doc.type)}
                                                        <div>
                                                            <strong className="doc-name">
                                                                {doc.title}
                                                            </strong>
                                                            <small className="doc-sub">
                                                                {doc.courseCode} • {doc.size} •{" "}
                                                                {doc.chunks} chunks
                                                            </small>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`checkbox-circle ${isSelected ? "checked" : ""}`}
                                                    >
                                                        {isSelected && (
                                                            <Check size={12} color="#ffffff" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ) : (
                            /* Nội dung Tab 2: Tải tài liệu mới từ máy tính */
                            <div className="modal-tab-body upload-new-view">
                                <div
                                    className="upload-dropzone-box"
                                    onClick={() => fileDeviceInputRef.current?.click()}
                                >
                                    <UploadCloud size={36} color="#059669" />
                                    <strong>Click to upload document from your computer</strong>
                                    <p>
                                        Supports PDF, DOCX, XLSX, PPTX, MD (Auto-vectorized into
                                        Documents Tab)
                                    </p>
                                    <span className="btn-browse-trigger">Browse File</span>
                                </div>
                                <input
                                    ref={fileDeviceInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt"
                                    hidden
                                    onChange={handleDeviceFileChange}
                                />
                            </div>
                        )}

                        <div className="modal-footer-action-bar">
                            <span className="selection-counter-text">
                                {attachedDocs.length} document(s) attached
                            </span>
                            <button
                                type="button"
                                className="btn-done-attaching"
                                onClick={() => setIsAttachModalOpen(false)}
                            >
                                Done Attaching
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Conversation;
