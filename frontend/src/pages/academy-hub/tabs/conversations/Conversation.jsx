import { useState, useRef, useEffect } from "react";
import {
    Plus,
    FileText,
    FileType,
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
    UploadCloud,
    Compass,
    RotateCcw,
    X,
} from "lucide-react";
import "./Conversation.css";

const MOCK_NOTEBOOK_SOURCES = [
    { id: "src-1", name: "Phrasal verbs & Idioms.pdf", type: "pdf", checked: true, size: "2.4 MB" },
    { id: "src-2", name: "IELTS Vocab Advanced.docx", type: "docx", checked: true, size: "1.2 MB" },
];

const STUDIO_TOOLS = [
    { id: "summary", label: "Tổng quan tài liệu", icon: Sparkles, color: "blue" },
    { id: "flashcards", label: "Thẻ ghi nhớ", icon: Layers, color: "amber" },
    { id: "quiz", label: "Bài kiểm tra", icon: HelpCircle, color: "green" },
    { id: "mindmap", label: "Bản đồ tư duy", icon: Compass, color: "purple" },
    { id: "presentation", label: "Bản trình bày", icon: Presentation, color: "rose" },
    { id: "datatable", label: "Bảng dữ liệu", icon: FileSpreadsheet, color: "teal" },
];

const Conversation = ({ onLaunchTool }) => {
    const [sources, setSources] = useState(MOCK_NOTEBOOK_SOURCES);
    const [isAllSelected, setIsAllSelected] = useState(true);
    const [messages, setMessages] = useState([
        {
            id: "msg-1",
            sender: "ai",
            text: "Các tài liệu trên cung cấp một danh sách tổng hợp các cụm động từ và từ vựng chuyên ngành. Tôi đã phân tích nội dung và sẵn sàng giải thích chi tiết, đặt câu hỏi kiểm tra hoặc hỗ trợ bạn tạo thẻ ghi nhớ từ các nguồn này.",
            timestamp: "30 thg 1, 2026",
        },
    ]);
    const [inputText, setInputText] = useState("");
    const [notes, setNotes] = useState([
        { id: "n-1", title: "Vocab quan trọng", date: "Hôm nay" },
        { id: "n-2", title: "Ghi chú ngữ pháp & cụm từ", date: "Hôm qua" },
    ]);
    const [copiedMsgId, setCopiedMsgId] = useState(null);

    const messagesEndRef = useRef(null);
    const fileUploadRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const toggleSelectSource = (id) => {
        setSources((prev) => prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s)));
    };

    const toggleSelectAll = () => {
        const nextState = !isAllSelected;
        setIsAllSelected(nextState);
        setSources((prev) => prev.map((s) => ({ ...s, checked: nextState })));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split(".").pop().toLowerCase();
        const newSource = {
            id: `src-${Date.now()}`,
            name: file.name,
            type: ext,
            checked: true,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        };

        setSources((prev) => [...prev, newSource]);
        if (fileUploadRef.current) fileUploadRef.current.value = "";
    };

    const handleSendMessage = (e) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        const activeCount = sources.filter((s) => s.checked).length;
        const userMsg = {
            id: `msg-${Date.now()}`,
            sender: "user",
            text: inputText,
            timestamp: "Vừa xong",
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText("");

        // Giả lập câu trả lời đối thoại
        setTimeout(() => {
            const aiMsg = {
                id: `msg-${Date.now() + 1}`,
                sender: "ai",
                text: `Dựa trên ${activeCount} nguồn tài liệu đang tham chiếu: "${userMsg.text}". Dưới đây là phân tích chi tiết và ví dụ ngữ cảnh cụ thể để bạn dễ nắm bắt kiến thức.`,
                timestamp: "Vừa xong",
            };
            setMessages((prev) => [...prev, aiMsg]);
        }, 700);
    };

    const handleCopyText = (id, text) => {
        navigator.clipboard.writeText(text);
        setCopiedMsgId(id);
        setTimeout(() => setCopiedMsgId(null), 1800);
    };

    const getFileIcon = (type) => {
        switch (type) {
            case "pdf":
                return <FileText size={15} className="file-glyph pdf" />;
            case "docx":
            case "doc":
                return <FileType size={15} className="file-glyph docx" />;
            case "xlsx":
            case "csv":
                return <FileSpreadsheet size={15} className="file-glyph xlsx" />;
            case "pptx":
                return <Presentation size={15} className="file-glyph pptx" />;
            default:
                return <FileText size={15} className="file-glyph default" />;
        }
    };

    const activeSourceCount = sources.filter((s) => s.checked).length;

    return (
        <div className="conversations-tab-bounds">
            {/* Header thanh công cụ Studio */}
            <div className="conversations-header-banner">
                <div className="banner-left-info">
                    <div className="studio-brand-badge">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <h2>Vocabulary & Course Study Workspace</h2>
                        <span>Không gian nghiên cứu, tóm tắt và hỏi đáp tài liệu thông minh</span>
                    </div>
                </div>

                <div className="banner-action-cluster">
                    <button
                        type="button"
                        className="btn-header-secondary"
                        onClick={() => {
                            const newNoteTitle = prompt("Nhập tiêu đề ghi chú mới:");
                            if (newNoteTitle) {
                                setNotes([
                                    {
                                        id: `n-${Date.now()}`,
                                        title: newNoteTitle,
                                        date: "Vừa xong",
                                    },
                                    ...notes,
                                ]);
                            }
                        }}
                    >
                        <Plus size={14} />
                        <span>Tạo ghi chú</span>
                    </button>
                    <button type="button" className="btn-header-secondary">
                        <Share2 size={14} />
                        <span>Chia sẻ</span>
                    </button>
                </div>
            </div>

            {/* Bố cục 3 Cột: Trái (Studio Tools) - Giữa (Chat Area) - Phải (Nguồn tài liệu) */}
            <div className="notebook-studio-grid">
                {/* 1. CỘT TRÁI: CÁC CÔNG CỤ STUDIO & GHI CHÚ */}
                <aside className="studio-column left-tools-panel">
                    <div className="column-panel-header">
                        <h3>Studio</h3>
                        <span className="panel-badge-count">{STUDIO_TOOLS.length} công cụ</span>
                    </div>

                    {/* Lưới các nút công cụ Studio */}
                    <div className="tools-buttons-grid">
                        {STUDIO_TOOLS.map((tool) => {
                            const Icon = tool.icon;
                            return (
                                <button
                                    key={tool.id}
                                    type="button"
                                    className={`studio-tool-tile ${tool.color}`}
                                    onClick={() => onLaunchTool && onLaunchTool(tool.id)}
                                >
                                    <Icon size={17} className="tile-icon" />
                                    <span className="tile-label">{tool.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Danh sách ghi chú học tập đã lưu */}
                    <div className="saved-notes-subcontainer">
                        <div className="subcontainer-header">
                            <h4>Ghi chú đã lưu ({notes.length})</h4>
                            <button
                                type="button"
                                className="btn-quick-add-note"
                                onClick={() => {
                                    const title = prompt("Nhập tiêu đề ghi chú:");
                                    if (title)
                                        setNotes([
                                            { id: `n-${Date.now()}`, title, date: "Hôm nay" },
                                            ...notes,
                                        ]);
                                }}
                            >
                                <Plus size={12} /> Thêm
                            </button>
                        </div>

                        <div className="notes-list-scroll">
                            {notes.map((note) => (
                                <div key={note.id} className="note-item-tile">
                                    <div className="note-tile-content">
                                        <FileCheck size={14} className="note-glyph" />
                                        <div>
                                            <strong>{note.title}</strong>
                                            <small>{note.date}</small>
                                        </div>
                                    </div>
                                    <button type="button" className="btn-note-context">
                                        <MoreVertical size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* 2. CỘT GIỮA: KHUNG CHAT VÀ TỔNG QUAN TÀI LIỆU */}
                <main className="studio-column center-chat-panel">
                    <div className="chat-messages-scroll-area">
                        {/* Tiêu đề tổng quan sổ ghi chép */}
                        <div className="notebook-overview-card">
                            <div className="notebook-book-emblem">
                                <BookOpen size={32} />
                            </div>
                            <h3>Vocabulary</h3>
                            <p className="overview-meta-line">
                                {activeSourceCount} nguồn • Đã kết nối với trợ lý học tập
                            </p>
                        </div>

                        {/* Luồng tin nhắn đối thoại */}
                        <div className="chat-dialogue-stream">
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

                    {/* Vùng soạn thảo câu hỏi phía đáy */}
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
                                    disabled={!inputText.trim()}
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </form>
                        <small className="ai-notice-line">
                            AI Tutor có thể mắc sai sót, bạn hãy xác minh lại các thông tin quan
                            trọng.
                        </small>
                    </div>
                </main>

                {/* 3. CỘT PHẢI: DANH MỤC CÁC NGUỒN TÀI LIỆU CỦA PHIÊN CHAT */}
                <aside className="studio-column right-sources-panel">
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
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt"
                        hidden
                        onChange={handleFileUpload}
                    />

                    {/* Hộp tìm nguồn trên Web */}
                    <div className="web-source-discovery-card">
                        <span>Tìm nguồn mới trên web</span>
                        <div className="web-input-wrapper">
                            <Globe size={13} />
                            <input type="text" placeholder="Nhập liên kết hoặc từ khóa..." />
                        </div>
                    </div>

                    {/* Danh sách các tài liệu đính kèm */}
                    <div className="sources-list-block">
                        <div className="sources-selection-toolbar">
                            <button
                                type="button"
                                className="btn-toggle-all-sources"
                                onClick={toggleSelectAll}
                            >
                                {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span>Chọn tất cả ({activeSourceCount})</span>
                            </button>
                        </div>

                        <div className="sources-scroll-track">
                            {sources.map((item) => (
                                <div
                                    key={item.id}
                                    className={`source-card-item ${item.checked ? "selected" : ""}`}
                                    onClick={() => toggleSelectSource(item.id)}
                                >
                                    <div className="source-icon-wrap">{getFileIcon(item.type)}</div>
                                    <div className="source-info-col">
                                        <strong title={item.name}>{item.name}</strong>
                                        <small>{item.size}</small>
                                    </div>
                                    <div className="source-checkbox-col">
                                        {item.checked ? (
                                            <CheckSquare
                                                size={15}
                                                className="checkbox-glyph checked"
                                            />
                                        ) : (
                                            <Square size={15} className="checkbox-glyph" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default Conversation;
