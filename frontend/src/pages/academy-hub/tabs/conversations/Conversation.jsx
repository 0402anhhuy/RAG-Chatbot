import { useCallback, useEffect, useRef, useState } from "react";
import {
    Plus,
    FileSpreadsheet,
    Presentation,
    Send,
    Bot,
    User,
    Sparkles,
    BookOpen,
    HelpCircle,
    Layers,
    Share2,
    CheckSquare,
    Square,
    Globe,
    MoreVertical,
    FileCheck,
    Check,
    Copy,
    RotateCcw,
    Loader2,
    Trash2,
    X,
} from "lucide-react";
import { studyApi } from "../../../../api";
import DocumentTypeIcon from "../../../../components/common/document-icon/DocumentTypeIcon";
import CustomSelector from "../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../context/ToastContext";
import "./Conversation.css";
import { getSessionUser } from "../../../../components/common/utils/session";

const TOOL_ICONS = {
    summary: Sparkles,
    flashcards: Layers,
    quiz: HelpCircle,
    mindmap: Globe,
    presentation: Presentation,
    datatable: FileSpreadsheet,
};

const Conversation = ({ workspaceId = null, onLaunchTool, initialDocument = null }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [notebook, setNotebook] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [busySourceId, setBusySourceId] = useState(null);
    const [runningTool, setRunningTool] = useState(false);
    const [inputText, setInputText] = useState("");

    // Modal state
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    const [copiedMsgId, setCopiedMsgId] = useState(null);
    const [webKeyword, setWebKeyword] = useState("");

    // Kéo giãn độ rộng cột
    const [leftWidth, setLeftWidth] = useState(280);
    const [rightWidth, setRightWidth] = useState(290);
    const isDraggingRef = useRef(null);

    const messagesEndRef = useRef(null);
    const fileUploadRef = useRef(null);

    const sources = notebook?.sources || [];
    const messages = notebook?.messages || [];
    const notes = notebook?.notes || [];
    const tools = notebook?.tools || [];
    const activeSourceCount = notebook?.activeSourceCount || 0;
    const isAllSelected = sources.length > 0 && sources.every((source) => source.checked);

    // Xử lý Resizer cột
    const handleMouseDown = (resizerType) => (e) => {
        e.preventDefault();
        isDraggingRef.current = {
            type: resizerType,
            startX: e.clientX,
            startLeft: leftWidth,
            startRight: rightWidth,
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDraggingRef.current) return;
            const { type, startX, startLeft, startRight } = isDraggingRef.current;
            const deltaX = e.clientX - startX;

            if (type === "left") {
                const newWidth = Math.min(Math.max(startLeft + deltaX, 200), 450);
                setLeftWidth(newWidth);
            } else if (type === "right") {
                const newWidth = Math.min(Math.max(startRight - deltaX, 220), 450);
                setRightWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = null;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    // Đóng Modal bằng phím Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isNoteModalOpen) {
                setIsNoteModalOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isNoteModalOpen]);

    const applyNotebook = useCallback((data) => {
        if (data) setNotebook(data);
    }, []);

    const loadNotebook = useCallback(
        async (signal) => {
            if (!sessionUser?.id && !workspaceId) {
                setNotebook(null);
                return;
            }
            try {
                setLoading(true);
                const data = await studyApi.getWorkspace({
                    ownerId: sessionUser?.id,
                    workspaceId,
                });
                if (signal?.cancelled) return;
                applyNotebook(data);
            } catch (err) {
                if (signal?.cancelled) return;
                setNotebook(null);
                showToast(err.message || "Unable to open the notebook.", "error");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [sessionUser?.id, workspaceId, applyNotebook, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadNotebook(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadNotebook]);

    const attachedDocumentId = initialDocument?.id || null;
    useEffect(() => {
        if (!attachedDocumentId || !notebook?.sessionId) return;
        const already = (notebook.sources || []).some(
            (source) => source.documentId === attachedDocumentId,
        );
        if (already) return;
        (async () => {
            try {
                const data = await studyApi.addSource(notebook.sessionId, {
                    documentId: attachedDocumentId,
                    checked: true,
                });
                applyNotebook(data);
                showToast("Document added to this notebook.", "success");
            } catch (err) {
                showToast(err.message || "Unable to attach the document.", "error");
            }
        })();
    }, [attachedDocumentId, notebook?.sessionId, notebook?.sources, applyNotebook, showToast]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const requireSession = () => {
        if (!notebook?.sessionId) {
            showToast("Notebook is still loading. Try again in a moment.", "info");
            return false;
        }
        return true;
    };

    const handleToggleSource = async (source) => {
        if (!requireSession()) return;
        try {
            setBusySourceId(source.attachmentId);
            const data = await studyApi.setSourceChecked(
                notebook.sessionId,
                source.attachmentId,
                !source.checked,
            );
            applyNotebook(data);
        } catch (err) {
            showToast(err.message || "Unable to update the source.", "error");
        } finally {
            setBusySourceId(null);
        }
    };

    const handleToggleAll = async () => {
        if (!requireSession()) return;
        try {
            const data = await studyApi.setAllSourcesChecked(notebook.sessionId, !isAllSelected);
            applyNotebook(data);
        } catch (err) {
            showToast(err.message || "Unable to update sources.", "error");
        }
    };

    const handleRemoveSource = async (source) => {
        if (!requireSession()) return;
        try {
            setBusySourceId(source.attachmentId);
            const data = await studyApi.removeSource(notebook.sessionId, source.attachmentId);
            applyNotebook(data);
            showToast("Source removed.", "success");
        } catch (err) {
            showToast(err.message || "Unable to remove the source.", "error");
        } finally {
            setBusySourceId(null);
        }
    };

    const handleFileUpload = async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        input.value = "";
        if (!file || !requireSession()) return;

        try {
            const uploaded = await studyApi.uploadSource(file, notebook.workspaceId);
            const data = await studyApi.addSource(notebook.sessionId, {
                documentId: uploaded.id,
                checked: true,
            });
            applyNotebook(data);
            showToast(`Added ${file.name} as a source.`, "success");
        } catch (err) {
            showToast(err.message || "Unable to add the file as a source.", "error");
        }
    };

    const handleSendMessage = async (event) => {
        event?.preventDefault();
        const text = inputText.trim();
        if (!text) return;
        if (!requireSession()) return;

        try {
            setSending(true);
            const data = await studyApi.sendMessage(notebook.sessionId, text);
            applyNotebook(data);
            setInputText("");
        } catch (err) {
            showToast(err.message || "Unable to send the message.", "error");
        } finally {
            setSending(false);
        }
    };

    const handleRunTool = async (tool) => {
        if (onLaunchTool && ["tutor", "exam_prep", "grader", "courseware"].includes(tool.id)) {
            onLaunchTool(tool.id);
            return;
        }
        if (!requireSession()) return;
        try {
            setRunningTool(true);
            const data = await studyApi.runStudioTool(notebook.sessionId, tool.id);
            applyNotebook(data);
            showToast(`${tool.label} generated.`, "success");
        } catch (err) {
            showToast(err.message || "Unable to run this tool.", "error");
        } finally {
            setRunningTool(false);
        }
    };

    const handleAddNote = async () => {
        const title = noteTitle.trim();
        if (!title) {
            showToast("Vui lòng nhập tiêu đề ghi chú.", "info");
            return;
        }
        try {
            setSavingNote(true);
            const data = await studyApi.addNote(sessionUser?.id, notebook?.sessionId, {
                workspaceId: notebook?.workspaceId,
                sessionId: notebook?.sessionId,
                title,
                content: noteContent.trim() || null,
            });
            applyNotebook(data);
            setNoteTitle("");
            setNoteContent("");
            setIsNoteModalOpen(false);
            showToast("Ghi chú đã được lưu.", "success");
        } catch (err) {
            showToast(err.message || "Không thể lưu ghi chú.", "error");
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteNote = async (note) => {
        if (!requireSession()) return;
        try {
            const data = await studyApi.deleteNote(notebook.sessionId, note.id);
            applyNotebook(data);
            showToast("Đã xóa ghi chú.", "success");
        } catch (err) {
            showToast(err.message || "Không thể xóa ghi chú.", "error");
        }
    };

    const handleCopyText = async (id, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMsgId(id);
            setTimeout(() => setCopiedMsgId(null), 1800);
        } catch {
            showToast("Unable to copy to the clipboard.", "error");
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            showToast("Link copied to clipboard.", "success");
        } catch {
            showToast("Unable to copy the link.", "error");
        }
    };

    const handleReload = () => {
        loadNotebook();
        showToast("Notebook refreshed.", "info");
    };

    const getFileIcon = (type) => <DocumentTypeIcon ext={(type || "").toLowerCase()} size={18} />;

    const sourceOptions = sources.map((source) => ({
        value: source.attachmentId,
        label: source.name,
    }));

    return (
        <div className="conversations-tab-bounds">
            {/* Header banner */}
            <div className="conversations-header-banner">
                <div className="banner-left-info">
                    <div className="studio-brand-badge">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <h2>{notebook?.title || "Study Workspace"}</h2>
                        <span>Không gian nghiên cứu, tóm tắt và hỏi đáp tài liệu thông minh</span>
                    </div>
                </div>

                <div className="banner-action-cluster">
                    <button
                        type="button"
                        className="btn-header-secondary"
                        onClick={() => setIsNoteModalOpen(true)}
                    >
                        <Plus size={14} />
                        <span>Tạo ghi chú</span>
                    </button>
                    <button type="button" className="btn-header-secondary" onClick={handleShare}>
                        <Share2 size={14} />
                        <span>Chia sẻ</span>
                    </button>
                </div>
            </div>

            {/* Bố cục 3 Cột có Resizer co giãn linh hoạt */}
            <div className="notebook-studio-grid">
                {/* 1. CỘT TRÁI: STUDIO TOOLS */}
                <aside
                    className="studio-column left-tools-panel"
                    style={{ width: `${leftWidth}px`, flexShrink: 0 }}
                >
                    <div className="column-panel-header">
                        <h3>Studio</h3>
                        <span className="panel-badge-count">
                            {tools.length} công cụ
                            {runningTool && <Loader2 size={11} className="ws-spinner" />}
                        </span>
                    </div>

                    <div className="tools-buttons-grid">
                        {tools.map((tool) => {
                            const Icon = TOOL_ICONS[tool.icon] || Sparkles;
                            return (
                                <button
                                    key={tool.id}
                                    type="button"
                                    className={`studio-tool-tile ${tool.color}`}
                                    onClick={() => handleRunTool(tool)}
                                    disabled={runningTool}
                                >
                                    <Icon size={17} className="tile-icon" />
                                    <span className="tile-label">{tool.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="saved-notes-subcontainer">
                        <div className="subcontainer-header">
                            <h4>Ghi chú đã lưu ({notes.length})</h4>
                            <button
                                type="button"
                                className="btn-quick-add-note"
                                onClick={() => setIsNoteModalOpen(true)}
                            >
                                <Plus size={12} /> Thêm
                            </button>
                        </div>

                        <div className="notes-list-scroll">
                            {notes.length === 0 ? (
                                <p className="empty-subtext">Chưa có ghi chú nào.</p>
                            ) : (
                                notes.map((note) => (
                                    <div key={note.id} className="note-item-tile">
                                        <div className="note-tile-content">
                                            <FileCheck size={14} className="note-glyph" />
                                            <div>
                                                <strong>{note.title}</strong>
                                                <small>{note.date}</small>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-note-context"
                                            title="Xoá ghi chú"
                                            onClick={() => handleDeleteNote(note)}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>

                {/* Thanh kéo Resizer bên trái */}
                <div
                    className="studio-resizer"
                    onMouseDown={handleMouseDown("left")}
                    title="Kéo để thay đổi độ rộng"
                />

                {/* 2. CỘT GIỮA: CHAT ARENA */}
                <main className="studio-column center-chat-panel">
                    <div className="chat-messages-scroll-area">
                        <div className="notebook-overview-card">
                            <div className="notebook-book-emblem">
                                <BookOpen size={30} />
                            </div>
                            <h3>{notebook?.title || "Vocabulary"}</h3>
                            <p className="overview-meta-line">
                                {activeSourceCount} nguồn • Đã kết nối với trợ lý học tập
                            </p>
                            <button
                                type="button"
                                className="btn-copy-bubble"
                                title="Tải lại notebook"
                                onClick={handleReload}
                            >
                                <RotateCcw size={12} />
                            </button>
                        </div>

                        <div className="chat-dialogue-stream">
                            {loading && messages.length === 0 && (
                                <div className="chat-bubble-row ai">
                                    <div className="bubble-avatar-box">
                                        <Bot size={15} />
                                    </div>
                                    <div className="bubble-body-column">
                                        <div className="bubble-text-box">
                                            <p>Đang mở notebook...</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!loading && messages.length === 0 && (
                                <div className="chat-bubble-row ai">
                                    <div className="bubble-avatar-box">
                                        <Bot size={15} />
                                    </div>
                                    <div className="bubble-body-column">
                                        <div className="bubble-text-box">
                                            <p>
                                                Notebook chưa có tin nhắn. Thêm nguồn tài liệu ở cột
                                                bên phải rồi đặt câu hỏi để bắt đầu.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div key={msg.id} className={`chat-bubble-row ${msg.sender}`}>
                                    <div className="bubble-avatar-box">
                                        {msg.sender === "ai" ? (
                                            <Bot size={15} />
                                        ) : (
                                            <User size={15} />
                                        )}
                                    </div>
                                    <div className="bubble-body-column">
                                        <div className="bubble-meta-info">
                                            <strong>
                                                {msg.sender === "ai" ? "AI Tutor" : "Bạn"}
                                            </strong>
                                            <span>{msg.timestamp}</span>
                                        </div>
                                        <div className="bubble-text-box">
                                            <p>{msg.text}</p>
                                            {msg.citations?.length > 0 && (
                                                <div className="message-citations">
                                                    <strong>Nguồn tham khảo</strong>
                                                    {msg.citations.map((citation, index) => (
                                                        <div
                                                            className="message-citation"
                                                            key={`${citation.chunk_id || citation.document_id || "source"}-${index}`}
                                                        >
                                                            <span>
                                                                {citation.file_name || "Tài liệu"}
                                                                {citation.page != null
                                                                    ? ` · trang ${citation.page}`
                                                                    : ""}
                                                            </span>
                                                            {citation.snippet && (
                                                                <small>{citation.snippet}</small>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {msg.sender === "ai" && (
                                                <button
                                                    type="button"
                                                    className="btn-copy-bubble"
                                                    onClick={() => handleCopyText(msg.id, msg.text)}
                                                    title="Sao chép nội dung"
                                                >
                                                    {copiedMsgId === msg.id ? (
                                                        <Check size={12} />
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="chat-bottom-dock">
                        <form className="chat-prompt-card" onSubmit={handleSendMessage}>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Đặt câu hỏi hoặc yêu cầu tạo nội dung từ tài liệu..."
                                rows={2}
                            />
                            <div className="prompt-controls-bar">
                                <span className="active-sources-hint">
                                    {activeSourceCount} nguồn tài liệu đang áp dụng
                                </span>
                                <button
                                    type="submit"
                                    className="btn-submit-message"
                                    disabled={!inputText.trim() || sending}
                                >
                                    {sending ? (
                                        <Loader2 size={14} className="ws-spinner" />
                                    ) : (
                                        <Send size={14} />
                                    )}
                                </button>
                            </div>
                        </form>
                        <small className="ai-notice-line">
                            AI Tutor có thể mắc sai sót, bạn hãy xác minh lại các thông tin quan
                            trọng.
                        </small>
                    </div>
                </main>

                {/* Thanh kéo Resizer bên phải */}
                <div
                    className="studio-resizer"
                    onMouseDown={handleMouseDown("right")}
                    title="Kéo để thay đổi độ rộng"
                />

                {/* 3. CỘT PHẢI: NGUỒN TÀI LIỆU */}
                <aside
                    className="studio-column right-sources-panel"
                    style={{ width: `${rightWidth}px`, flexShrink: 0 }}
                >
                    <div className="column-panel-header">
                        <h3>Nguồn</h3>
                        <span className="panel-badge-count">{sources.length} tệp</span>
                    </div>

                    <button
                        type="button"
                        className="btn-add-source-trigger"
                        onClick={() => fileUploadRef.current?.click()}
                    >
                        <Plus size={15} />
                        <span>Thêm nguồn</span>
                    </button>
                    <input
                        ref={fileUploadRef}
                        type="file"
                        accept=".pdf,.txt,.md,.markdown,.rst,.log,.json,.csv"
                        hidden
                        onChange={handleFileUpload}
                    />

                    {sourceOptions.length > 0 && (
                        <div className="source-selector-wrapper">
                            <CustomSelector
                                options={sourceOptions}
                                value={""}
                                onChange={(value) => {
                                    const source = sources.find(
                                        (item) => item.attachmentId === value,
                                    );
                                    if (source) handleToggleSource(source);
                                }}
                                placeholder="Chọn nguồn để bật/tắt"
                            />
                        </div>
                    )}

                    <div className="web-source-discovery-card">
                        <span>Tìm nguồn mới trên web</span>
                        <div className="web-input-wrapper">
                            <Globe size={13} />
                            <input
                                type="text"
                                placeholder="Nhập liên kết hoặc từ khóa..."
                                value={webKeyword}
                                onChange={(event) => setWebKeyword(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key !== "Enter" || !webKeyword.trim()) return;
                                    event.preventDefault();
                                    const url = webKeyword.trim();
                                    window.open(
                                        /^https?:\/\//i.test(url)
                                            ? url
                                            : `https://www.google.com/search?q=${encodeURIComponent(url)}`,
                                        "_blank",
                                    );
                                    showToast("Opened the search in a new tab.", "info");
                                }}
                            />
                        </div>
                    </div>

                    <div className="sources-list-block">
                        <div className="sources-selection-toolbar">
                            <button
                                type="button"
                                className="btn-toggle-all-sources"
                                onClick={handleToggleAll}
                                disabled={sources.length === 0}
                            >
                                {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span>Chọn tất cả ({activeSourceCount})</span>
                            </button>
                        </div>

                        <div className="sources-scroll-track">
                            {sources.length === 0 ? (
                                <p className="empty-subtext">Chưa có nguồn tài liệu nào.</p>
                            ) : (
                                sources.map((item) => (
                                    <div
                                        key={item.attachmentId}
                                        className={`source-card-item ${item.checked ? "selected" : ""}`}
                                        onClick={() => handleToggleSource(item)}
                                    >
                                        <div className="source-icon-wrap">
                                            {getFileIcon(item.type)}
                                        </div>
                                        <div className="source-info-col">
                                            <strong title={item.name}>{item.name}</strong>
                                            <small>{item.size}</small>
                                        </div>
                                        <div className="source-checkbox-col">
                                            {busySourceId === item.attachmentId ? (
                                                <Loader2 size={15} className="ws-spinner" />
                                            ) : item.checked ? (
                                                <CheckSquare
                                                    size={15}
                                                    className="checkbox-glyph checked"
                                                />
                                            ) : (
                                                <Square size={15} className="checkbox-glyph" />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-note-context"
                                            title="Xoá nguồn"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleRemoveSource(item);
                                            }}
                                        >
                                            <MoreVertical size={13} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* MODAL TẠO GHI CHÚ */}
            {isNoteModalOpen && (
                <div className="modal-backdrop-overlay" onClick={() => setIsNoteModalOpen(false)}>
                    <div className="modal-note-container" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-note-header">
                            <div className="modal-note-title-cluster">
                                <FileCheck size={18} color="var(--success)" />
                                <h3>Tạo ghi chú mới</h3>
                            </div>
                            <button
                                type="button"
                                className="btn-modal-close"
                                onClick={() => setIsNoteModalOpen(false)}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="modal-note-body">
                            <div className="modal-form-group">
                                <label>Tiêu đề ghi chú *</label>
                                <input
                                    type="text"
                                    className="modal-input-control"
                                    placeholder="e.g. Định nghĩa cấu trúc giải thuật..."
                                    value={noteTitle}
                                    onChange={(e) => setNoteTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="modal-form-group">
                                <label>Nội dung ghi chú</label>
                                <textarea
                                    className="modal-textarea-control"
                                    placeholder="Ghi lại các ý chính, câu hỏi cần nhớ hoặc phân tích từ tài liệu..."
                                    rows={6}
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="modal-note-footer">
                            <button
                                type="button"
                                className="btn-modal-secondary"
                                onClick={() => setIsNoteModalOpen(false)}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                className="btn-modal-primary"
                                onClick={handleAddNote}
                                disabled={savingNote || !noteTitle.trim()}
                            >
                                {savingNote ? (
                                    <Loader2 size={14} className="ws-spinner" />
                                ) : (
                                    <Plus size={14} />
                                )}
                                <span>Lưu ghi chú</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Conversation;
