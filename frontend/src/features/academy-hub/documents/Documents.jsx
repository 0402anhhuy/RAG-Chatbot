import { useState, useRef, useEffect, useCallback } from "react";
import {
    BookOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    Code2,
    Download,
    FileText,
    Filter,
    FolderOpen,
    Eye,
    Maximize2,
    Loader2,
    MoreHorizontal,
    Pencil,
    Presentation,
    Search,
    Sparkles,
    Table2,
    Trash2,
    UploadCloud,
    ZoomIn,
    ZoomOut,
    CheckCircle2,
    Star,
    X,
    Sun,
    Moon,
    Coffee,
    CheckCircle,
    StickyNote,
    MessageSquareQuote,
    HelpCircle,
    Plus,
    Clock,
    Save,
    Minimize2,
} from "lucide-react";
import { documentApi } from "@/api/documents.js";
import {
    parsePresentation,
    parseSpreadsheet,
    renderDocxBlob,
} from "@/features/academy-hub/documents/helpers/preview.js";
import DocumentTypeIcon from "@/components/document-icon/DocumentTypeIcon.jsx";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import "@/features/academy-hub/documents/Documents.css";

// Định dạng được duyệt và mở ngay trong trang (null = chưa hỗ trợ xem trước).
const VIEWER_BY_EXT = {
    pdf: "pdf",
    doc: "word",
    docx: "word",
    xls: "excel",
    xlsx: "excel",
    csv: "excel",
    ppt: "slides",
    pptx: "slides",
    md: "markdown",
    markdown: "markdown",
    txt: "text",
};

// Nhãn hiển thị cho từng loại (dùng cho filter và tooltip).
const FORMAT_LABELS = {
    pdf: "PDF",
    word: "Word",
    excel: "Excel",
    slides: "PowerPoint",
    markdown: "Markdown",
    text: "Text",
};

// Danh sách các loại ghi chú học tập
const NOTE_TYPES = [
    { id: "general", label: "Ghi chú chung", color: "green" },
    { id: "concept", label: "Khái niệm", color: "blue" },
    { id: "formula", label: "Công thức", color: "purple" },
    { id: "exam", label: "Trọng tâm thi", color: "amber" },
    { id: "question", label: "Cần hỏi lại", color: "rose" },
];

/**
 * Lấy phần mở rộng của tài liệu: ưu tiên fileType do BE trả về, rồi tới tên file
 * (fileType có thể null với dữ liệu cũ), rồi tới title.
 */
const extOf = (doc) => {
    if (!doc) return "";
    const direct = (doc.fileType || doc.type || "").toString().trim().toLowerCase();
    if (direct) return direct.replace(/^\./, "");
    const name = doc.filename || doc.title || "";
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

const viewerOf = (ext) => VIEWER_BY_EXT[ext] || null;

const Documents = ({
    workspaceId = "00000000-0000-0000-0000-000000000001",
    onLaunchTool,
    onAskTutor,
}) => {
    const { showToast } = useToast();

    // --- STATE TÀI LIỆU (GIỮ NGUYÊN) ---
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [zoomLevel, setZoomLevel] = useState(100);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [previewContent, setPreviewContent] = useState("");
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
    const [loadingDocx, setLoadingDocx] = useState(false);

    // Office Previews (Excel & PPTX)
    const [spreadsheetSheets, setSpreadsheetSheets] = useState([]);
    const [activeSpreadsheetSheet, setActiveSpreadsheetSheet] = useState("");
    const [presentationSlides, setPresentationSlides] = useState([]);
    const [activePptxSlide, setActivePptxSlide] = useState(0);
    const [loadingOfficePreview, setLoadingOfficePreview] = useState(false);
    const [officePreviewError, setOfficePreviewError] = useState("");

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
    const [courseFilter, setCourseFilter] = useState("all");
    const [sortBy, setSortBy] = useState("recent");
    const [contentSearchQuery, setContentSearchQuery] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [actionNotice, setActionNotice] = useState("");
    const [markdownViewMode, setMarkdownViewMode] = useState("preview");
    const [isDocumentToolsOpen, setIsDocumentToolsOpen] = useState(false);

    // --- TÍNH NĂNG NGƯỜI HỌC & GHI CHÚ TOÀN MÀN HÌNH ---
    const [completedDocIds, setCompletedDocIds] = useState(new Set());
    const [readingTheme, setReadingTheme] = useState("light"); // 'light' | 'sepia' | 'dark'

    // Modal ghi chú Fullscreen + Stack Ghi Chú
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [notesStack, setNotesStack] = useState({}); // { [docId]: [{ id, title, content, type, updatedAt }] }
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [noteTitleInput, setNoteTitleInput] = useState("");
    const [noteContentInput, setNoteContentInput] = useState("");
    const [noteTypeInput, setNoteTypeInput] = useState("general");

    // Modal Đổi tên & Gán loại ghi chú khi bấm Icon Cây bút chì
    const [editingNoteModal, setEditingNoteModal] = useState(null); // note object or null
    const [editModalTitle, setEditModalTitle] = useState("");
    const [editModalType, setEditModalType] = useState("general");

    // Selection floating menu
    const [selectedText, setSelectedText] = useState("");
    const [selectionCoord, setSelectionCoord] = useState(null);

    const fileUploadRef = useRef(null);
    const docxContainerRef = useRef(null);
    const modalDocxContainerRef = useRef(null);
    const documentToolsMenuRef = useRef(null);

    // 1. Fetch danh sách tài liệu từ API
    const fetchDocuments = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await documentApi.getByWorkspace(workspaceId, {
                fileType: typeFilter !== "all" ? typeFilter : null,
            });
            const docList = Array.isArray(data) ? data : [];
            setDocuments(docList);
            localStorage.setItem("academy_hub_documents", JSON.stringify(docList));

            if (docList.length > 0) {
                setSelectedDoc((prev) => {
                    const exists = docList.find((d) => d.id === prev?.id);
                    return exists || docList[0];
                });
            } else {
                setSelectedDoc(null);
            }
        } catch (err) {
            console.error("Failed to load documents:", err);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, typeFilter]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // Khởi tạo stack ghi chú từ LocalStorage khi khởi động
    useEffect(() => {
        const savedNotes = localStorage.getItem("academy_hub_document_notes_stack");
        if (savedNotes) {
            try {
                setNotesStack(JSON.parse(savedNotes));
            } catch (e) {
                console.error("Failed to parse notes stack:", e);
            }
        }
    }, []);

    // Lưu notesStack vào LocalStorage mỗi khi có thay đổi
    const persistNotesStack = (updated) => {
        setNotesStack(updated);
        localStorage.setItem("academy_hub_document_notes_stack", JSON.stringify(updated));
    };

    // Khi mở Modal ghi chú hoặc đổi tài liệu
    const handleOpenNotesModal = () => {
        if (!selectedDoc) return;
        const currentDocNotes = notesStack[selectedDoc.id] || [];
        if (currentDocNotes.length > 0) {
            const latest = currentDocNotes[0];
            setActiveNoteId(latest.id);
            setNoteTitleInput(latest.title);
            setNoteContentInput(latest.content);
            setNoteTypeInput(latest.type || "general");
        } else {
            handleCreateNewNote();
        }
        setIsNotesModalOpen(true);
    };

    const handleCreateNewNote = () => {
        const newId = `note-${Date.now()}`;
        setActiveNoteId(newId);
        setNoteTitleInput(`Ghi chú #${(notesStack[selectedDoc?.id]?.length || 0) + 1}`);
        setNoteContentInput("");
        setNoteTypeInput("general");
    };

    const handleSelectNoteFromStack = (note) => {
        setActiveNoteId(note.id);
        setNoteTitleInput(note.title);
        setNoteContentInput(note.content);
        setNoteTypeInput(note.type || "general");
    };

    const handleSaveCurrentNote = () => {
        if (!selectedDoc) return;
        const docId = selectedDoc.id;
        const currentList = notesStack[docId] || [];
        const existingIndex = currentList.findIndex((n) => n.id === activeNoteId);

        const updatedNote = {
            id: activeNoteId || `note-${Date.now()}`,
            title: noteTitleInput.trim() || "Ghi chú không tên",
            content: noteContentInput,
            type: noteTypeInput || "general",
            updatedAt: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
            }),
        };

        let updatedList;
        if (existingIndex >= 0) {
            updatedList = [updatedNote, ...currentList.filter((_, idx) => idx !== existingIndex)];
        } else {
            updatedList = [updatedNote, ...currentList];
        }

        const nextStack = { ...notesStack, [docId]: updatedList };
        persistNotesStack(nextStack);
        showActionNotice("Đã lưu ghi chú vào danh sách!");
    };

    const handleDeleteNoteFromStack = (noteId, e) => {
        e?.stopPropagation();
        if (!selectedDoc) return;
        const docId = selectedDoc.id;
        const currentList = notesStack[docId] || [];
        const updatedList = currentList.filter((n) => n.id !== noteId);
        const nextStack = { ...notesStack, [docId]: updatedList };
        persistNotesStack(nextStack);

        if (activeNoteId === noteId) {
            if (updatedList.length > 0) {
                handleSelectNoteFromStack(updatedList[0]);
            } else {
                handleCreateNewNote();
            }
        }
        showActionNotice("Đã xóa ghi chú.");
    };

    // Mở popup rename và đổi type khi nhấn icon bút chì
    const handleOpenEditNoteModal = (note, e) => {
        e?.stopPropagation();
        setEditingNoteModal(note);
        setEditModalTitle(note.title);
        setEditModalType(note.type || "general");
    };

    // Lưu chỉnh sửa từ modal rename/type
    const handleConfirmEditNoteModal = (e) => {
        e?.preventDefault();
        if (!selectedDoc || !editingNoteModal) return;

        const trimmedTitle = editModalTitle.trim();
        if (!trimmedTitle) {
            showActionNotice("Tên ghi chú không được để trống.");
            return;
        }

        const docId = selectedDoc.id;
        const currentList = notesStack[docId] || [];
        const updatedList = currentList.map((item) =>
            item.id === editingNoteModal.id
                ? {
                      ...item,
                      title: trimmedTitle,
                      type: editModalType,
                      updatedAt: new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                      }),
                  }
                : item,
        );

        persistNotesStack({ ...notesStack, [docId]: updatedList });

        // Cập nhật lại khung editor nếu đang chọn đúng ghi chú này
        if (activeNoteId === editingNoteModal.id) {
            setNoteTitleInput(trimmedTitle);
            setNoteTypeInput(editModalType);
        }

        setEditingNoteModal(null);
        showActionNotice("Đã cập nhật thông tin ghi chú!");
    };

    // Xử lý menu nổi khi bôi đen văn bản trong tài liệu
    const handleMouseUpSelection = () => {
        const selection = window.getSelection();
        const text = selection?.toString()?.trim();
        if (text && text.length > 3) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelectedText(text);
            setSelectionCoord({
                top: Math.max(12, rect.top - 46),
                left: Math.max(12, rect.left + rect.width / 2),
            });
        } else {
            setSelectionCoord(null);
            setSelectedText("");
        }
    };

    useEffect(() => {
        if (!isDocumentToolsOpen) return undefined;
        const closeDocumentTools = (event) => {
            if (event.type === "keydown" && event.key !== "Escape") return;
            if (event.type === "mousedown" && documentToolsMenuRef.current?.contains(event.target))
                return;
            setIsDocumentToolsOpen(false);
        };
        document.addEventListener("mousedown", closeDocumentTools);
        document.addEventListener("keydown", closeDocumentTools);
        return () => {
            document.removeEventListener("mousedown", closeDocumentTools);
            document.removeEventListener("keydown", closeDocumentTools);
        };
    }, [isDocumentToolsOpen]);

    // 2. Fetch Markdown / TXT
    useEffect(() => {
        if (!selectedDoc) {
            setPreviewContent("");
            return;
        }

        const ext = extOf(selectedDoc);
        if (["md", "markdown", "txt"].includes(ext)) {
            setLoadingPreview(true);
            documentApi.getPreview(selectedDoc.id)
                .then((blob) => blob.text())
                .then((text) => setPreviewContent(text))
                .catch(() => setPreviewContent("Error loading preview."))
                .finally(() => setLoadingPreview(false));
        } else {
            setPreviewContent("");
        }
        setMarkdownViewMode("preview");
    }, [selectedDoc]);

    useEffect(() => {
        let cancelled = false;
        let objectUrl = "";
        setPdfPreviewUrl("");
        if (extOf(selectedDoc) !== "pdf") {
            return () => {
                cancelled = true;
            };
        }
        documentApi.getPreview(selectedDoc.id)
            .then((blob) => {
                objectUrl = URL.createObjectURL(blob);
                if (cancelled) URL.revokeObjectURL(objectUrl);
                else setPdfPreviewUrl(objectUrl);
            })
            .catch((error) => {
                if (!cancelled) showToast(error.message || "Unable to preview this document.", "error");
            });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [selectedDoc, showToast]);

    // 3. Render file DOCX
    useEffect(() => {
        if (!selectedDoc) return;
        const ext = extOf(selectedDoc);
        if (ext === "docx" || ext === "doc") {
            setLoadingDocx(true);
            documentApi.getDownload(selectedDoc.id)
                .then((blob) => {
                    renderDocxBlob(blob, docxContainerRef);
                    if (isNotesModalOpen) renderDocxBlob(blob, modalDocxContainerRef);
                })
                .catch((err) => {
                    console.error("DOCX error:", err);
                })
                .finally(() => setLoadingDocx(false));
        }
    }, [selectedDoc, isNotesModalOpen]);

    // 4. Render Excel & PPTX
    useEffect(() => {
        if (!selectedDoc) return;
        const ext = extOf(selectedDoc);

        if (["xls", "xlsx", "csv"].includes(ext)) {
            setLoadingOfficePreview(true);
            setOfficePreviewError("");
            setSpreadsheetSheets([]);

            documentApi
                .getDownload(selectedDoc.id)
                .then(parseSpreadsheet)
                .then((sheets) => {
                    setSpreadsheetSheets(sheets);
                    setActiveSpreadsheetSheet(sheets[0].name);
                })
                .catch((err) => setOfficePreviewError(err.message))
                .finally(() => setLoadingOfficePreview(false));
        }

        if (ext === "pptx") {
            setLoadingOfficePreview(true);
            setOfficePreviewError("");
            setPresentationSlides([]);
            setActivePptxSlide(0);

            documentApi
                .getDownload(selectedDoc.id)
                .then(parsePresentation)
                .then(setPresentationSlides)
                .catch((err) => setOfficePreviewError(err.message))
                .finally(() => setLoadingOfficePreview(false));
        }
    }, [selectedDoc]);

    /**
     * Icon theo đúng định dạng tài liệu, dùng logo dạng app (Word xanh dương,
     * Excel xanh lá, PowerPoint cam, PDF đỏ) để nhận ra ngay như trên máy tính.
     * Extension lạ (vd .zip) dùng badge trung tính.
     */
    const getDocIcon = (typeOrExt, size = 22) => (
        <DocumentTypeIcon
            ext={(typeOrExt || "").toLowerCase()}
            size={size}
            className="file-type-icon"
        />
    );

    // Nhãn định dạng hiển thị cạnh kích thước file: "PDF", "Word (DOCX)"...
    const formatLabelOf = (doc) => {
        const ext = extOf(doc).toUpperCase();
        const viewer = viewerOf(extOf(doc));
        if (!viewer) return ext || "File";
        const label = FORMAT_LABELS[viewer].toUpperCase();
        return ext && ext !== label ? `${label} (${ext})` : label;
    };

    const availableCourses = [...new Set(documents.map((doc) => doc.courseCode).filter(Boolean))];
    const getDocumentTitle = (doc) => doc.title || doc.filename || "Untitled document";

    const filteredDocs = documents
        .filter((doc) => {
            const title = getDocumentTitle(doc);
            const course = doc.courseCode || "";
            const matchesQuery =
                title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCourse = courseFilter === "all" || course === courseFilter;
            const matchesFavorite =
                !isAdvancedFiltersOpen || !favoriteIds.size || favoriteIds.has(doc.id);
            return matchesQuery && matchesCourse && matchesFavorite;
        })
        .sort((first, second) => {
            if (sortBy === "name")
                return getDocumentTitle(first).localeCompare(getDocumentTitle(second));
            if (sortBy === "size")
                return (second.size || 0).toString().localeCompare((first.size || 0).toString());
            return new Date(second.uploadedAt || 0) - new Date(first.uploadedAt || 0);
        });

    const selectedVisibleIds = filteredDocs
        .filter((doc) => selectedIds.has(doc.id))
        .map((doc) => doc.id);
    const allVisibleSelected =
        filteredDocs.length > 0 && selectedVisibleIds.length === filteredDocs.length;

    const showActionNotice = (message) => {
        setActionNotice(message);
        window.setTimeout(() => setActionNotice(""), 2600);
    };

    const handleToggleSelected = (id, e) => {
        e?.stopPropagation();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllVisible = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) selectedVisibleIds.forEach((id) => next.delete(id));
            else filteredDocs.forEach((doc) => next.add(doc.id));
            return next;
        });
    };

    const handleToggleFavorite = (id, e) => {
        e?.stopPropagation();
        setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleCompleted = (docId) => {
        const id = docId || selectedDoc?.id;
        if (!id) return;
        setCompletedDocIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                showActionNotice("Đã chuyển về trạng thái đang học.");
            } else {
                next.add(id);
                showActionNotice("Tuyệt vời! Đã hoàn thành bài học.");
            }
            return next;
        });
    };

    const handleSelectionAction = (actionType) => {
        if (!selectedText) return;
        if (actionType === "ask") {
            if (onAskTutor) onAskTutor(selectedDoc, selectedText);
            else onLaunchTool?.("tutor");
        } else if (actionType === "quiz") {
            showActionNotice("Đang tạo câu hỏi trắc nghiệm từ đoạn đã chọn...");
            onLaunchTool?.("exam_prep");
        } else if (actionType === "explain") {
            showActionNotice("AI Tutor đang chuẩn bị lời giải thích cho khái niệm này.");
            onLaunchTool?.("tutor");
        }
        setSelectionCoord(null);
    };

    const handleFilesUpload = async (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        try {
            setIsUploading(true);
            const responses = await Promise.all(
                files.map((file) => documentApi.upload(file, workspaceId, "GEN")),
            );
            await fetchDocuments();
            const uploadedDoc = responses[0]?.document || responses[0];
            if (uploadedDoc) setSelectedDoc(uploadedDoc);
            showActionNotice(`Đã thêm ${files.length} tài liệu học tập.`);
        } catch (err) {
            showToast(err.message || "Upload failed. Please try again.", "error");
        } finally {
            setIsUploading(false);
            if (fileUploadRef.current) fileUploadRef.current.value = "";
        }
    };

    const handleFileUpload = async (e) => {
        await handleFilesUpload(e.target.files);
    };

    const handleDownloadDocument = async (doc) => {
        try {
            const blob = await documentApi.getDownload(doc.id);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = doc.filename || doc.title || "document";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) {
            showToast(error.message || "Unable to download this document.", "error");
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        await handleFilesUpload(e.dataTransfer.files);
    };

    const handleDeleteDocument = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) return;
        try {
            await documentApi.delete(id);
            await fetchDocuments();
            showActionNotice("Đã xóa tài liệu.");
        } catch (err) {
            showToast(err.message || "Delete failed. Please try again.", "error");
        }
    };

    const handleBulkMarkCompleted = () => {
        setCompletedDocIds((prev) => {
            const next = new Set(prev);
            selectedIds.forEach((id) => next.add(id));
            return next;
        });
        showActionNotice(`Đã đánh dấu hoàn thành ${selectedIds.size} tài liệu.`);
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;
        if (!window.confirm(`Xóa ${selectedIds.size} tài liệu đã chọn?`)) return;
        try {
            await Promise.all([...selectedIds].map((id) => documentApi.delete(id)));
            setSelectedIds(new Set());
            await fetchDocuments();
            showActionNotice("Các tài liệu đã chọn đã được xóa.");
        } catch (err) {
            showToast(err.message || "Bulk delete failed. Please try again.", "error");
        }
    };

    const handleDocumentAction = (action) => {
        const labels = {
            summarize: "AI Tutor đang tóm tắt các điểm trọng tâm của tài liệu.",
            flashcards: "Flashcard sẽ được tạo từ các khái niệm quan trọng trong tài liệu.",
            quiz: "Quiz luyện tập sẽ được tạo từ tài liệu đang mở.",
        };
        showActionNotice(labels[action]);
        if (action === "quiz" && onLaunchTool) onLaunchTool("exam_prep");
    };

    const handleAskTutor = () => {
        if (!selectedDoc) return;
        if (onAskTutor) {
            onAskTutor(selectedDoc);
            return;
        }
        onLaunchTool?.("tutor");
    };

    const renderSearchableText = (text) => {
        if (!contentSearchQuery.trim()) return text;
        const escapedTerm = contentSearchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return text
            .split(new RegExp(`(${escapedTerm})`, "gi"))
            .map((part, index) =>
                part.toLowerCase() === contentSearchQuery.trim().toLowerCase() ? (
                    <mark key={`${part}-${index}`}>{part}</mark>
                ) : (
                    part
                ),
            );
    };

    const renderInlineMarkdown = (text) => {
        const inlinePattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
        return text.split(inlinePattern).map((part, index) => {
            if (part.startsWith("`") && part.endsWith("`")) {
                return (
                    <code key={`${part}-${index}`} className="md-preview-inline-code">
                        {part.slice(1, -1)}
                    </code>
                );
            }
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
            }
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return (
                    <a
                        key={`${part}-${index}`}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {linkMatch[1]}
                    </a>
                );
            }
            return renderSearchableText(part);
        });
    };

    const renderMarkdownCode = (text) =>
        text.split("\n").map((line, index) => {
            const headingMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
            const listMatch = line.match(/^([-*]|\d+\.)(\s+)(.*)$/);
            const lineContent = headingMatch ? (
                <>
                    <span className="md-token-heading">{headingMatch[1]}</span>
                    <span>{headingMatch[2]}</span>
                    <span className="md-token-heading-text">{headingMatch[3]}</span>
                </>
            ) : listMatch ? (
                <>
                    <span className="md-token-list">{listMatch[1]}</span>
                    <span>{listMatch[2]}</span>
                    <span className="md-token-text">{listMatch[3]}</span>
                </>
            ) : (
                renderInlineMarkdown(line)
            );

            return (
                <span className="markdown-code-line" key={`line-${index}`}>
                    {lineContent}
                    {index < text.split("\n").length - 1 ? <br /> : null}
                </span>
            );
        });

    const renderMarkdownPreview = (text) =>
        text.split("\n").map((line, index) => {
            const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
            const listMatch = line.match(/^([-*]|\d+\.)(\s+)(.*)$/);
            if (!line.trim()) return <div className="md-preview-spacer" key={`space-${index}`} />;
            if (headingMatch) {
                const Heading = `h${headingMatch[1].length}`;
                return (
                    <Heading key={`heading-${index}`}>
                        {renderInlineMarkdown(headingMatch[2])}
                    </Heading>
                );
            }
            if (listMatch)
                return <li key={`list-${index}`}>{renderInlineMarkdown(listMatch[3])}</li>;
            return <p key={`paragraph-${index}`}>{renderInlineMarkdown(line)}</p>;
        });

    const currentExt = extOf(selectedDoc);
    const currentViewer = viewerOf(currentExt);
    // .ppt là định dạng nhị phân cũ: trình duyệt không đọc được, phải tải về.
    const isLegacyPpt = currentExt === "ppt";
    const isCurrentDocCompleted = selectedDoc && completedDocIds.has(selectedDoc.id);

    // Sheet đang mở và Slide đang mở
    const activeSheet =
        spreadsheetSheets.find((s) => s.name === activeSpreadsheetSheet) || spreadsheetSheets[0];
    const activeSlide = presentationSlides[activePptxSlide];
    const currentDocNotesList = (selectedDoc && notesStack[selectedDoc.id]) || [];

    // Helper render badge loại ghi chú
    const renderNoteTypeBadge = (typeId) => {
        const found = NOTE_TYPES.find((t) => t.id === typeId) || NOTE_TYPES[0];
        return <span className={`note-type-pill ${found.color}`}>{found.label}</span>;
    };

    // Hàm render khung đọc tài liệu
    const renderDocumentViewer = (isInsideModal = false) => (
        <div className={`preview-scroll-viewport ${currentViewer === "pdf" ? "pdf-mode" : ""}`}>
            {/* 1. PDF */}
            {currentViewer === "pdf" && (
                <div className="pdf-iframe-container">
                    <iframe
                        src={pdfPreviewUrl ? `${pdfPreviewUrl}#scrollbar=0` : undefined}
                        title={selectedDoc.filename || selectedDoc.title}
                        className="pdf-iframe-view"
                    />
                </div>
            )}

            {/* 2. DOCX */}
            {currentViewer === "word" && (
                <div
                    className="docx-outer-wrapper"
                    style={{
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: "top center",
                    }}
                >
                    {loadingDocx && (
                        <div className="docs-loading-placeholder">
                            <Loader2 size={24} className="spin-animate" />
                            <span>Opening Word document...</span>
                        </div>
                    )}
                    <div
                        ref={isInsideModal ? modalDocxContainerRef : docxContainerRef}
                        className="docx-render-container"
                        style={{ display: loadingDocx ? "none" : "block" }}
                    />
                </div>
            )}

            {/* 3. MARKDOWN / TXT — .md được render, .txt giữ nguyên xuống dòng */}
            {["markdown", "text"].includes(currentViewer) && (
                <div
                    className="preview-paper-sheet"
                    style={{
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: "top center",
                    }}
                >
                    <div
                        className={`markdown-viewer-mock ${markdownViewMode === "code" ? "markdown-code-mode" : "markdown-preview-mode"}`}
                    >
                        {loadingPreview ? (
                            <div className="docs-loading-placeholder">
                                <Loader2 size={20} className="spin-animate" />
                                <span>Loading text notes...</span>
                            </div>
                        ) : markdownViewMode === "code" || currentViewer === "text" ? (
                            <pre className="md-code-raw markdown-source-editor">
                                <code>
                                    {currentViewer === "text"
                                        ? previewContent || "Empty file content"
                                        : renderMarkdownCode(
                                              previewContent || "Empty file content",
                                          )}
                                </code>
                            </pre>
                        ) : (
                            <article className="markdown-rendered-paper">
                                {renderMarkdownPreview(previewContent || "Empty file content")}
                            </article>
                        )}
                    </div>
                </div>
            )}

            {/* 4. EXCEL */}
            {currentViewer === "excel" && (
                <div className="office-preview-shell">
                    {loadingOfficePreview ? (
                        <div className="docs-loading-placeholder">
                            <Loader2 size={24} className="spin-animate" />
                            <span>Opening spreadsheet...</span>
                        </div>
                    ) : officePreviewError ? (
                        <div className="office-preview-empty">
                            {getDocIcon(currentExt, 40)}
                            <strong>Spreadsheet preview unavailable</strong>
                            <span>{officePreviewError}</span>
                        </div>
                    ) : (
                        <div className="spreadsheet-preview">
                            <div className="office-preview-heading">
                                <div>
                                    <span className="office-preview-kicker">
                                        <Table2 size={13} /> Spreadsheet preview
                                    </span>
                                    <strong>
                                        {spreadsheetSheets.length} sheet
                                        {spreadsheetSheets.length === 1 ? "" : "s"}
                                    </strong>
                                </div>
                                <span className="office-preview-note">Showing up to 200 rows</span>
                            </div>
                            <div className="spreadsheet-tabs">
                                {spreadsheetSheets.map((sheet) => (
                                    <button
                                        key={sheet.name}
                                        type="button"
                                        className={
                                            activeSpreadsheetSheet === sheet.name ? "active" : ""
                                        }
                                        onClick={() => setActiveSpreadsheetSheet(sheet.name)}
                                    >
                                        {sheet.name}
                                    </button>
                                ))}
                            </div>
                            <div className="spreadsheet-table-viewport">
                                {activeSheet?.rows?.length ? (
                                    <table className="spreadsheet-table">
                                        <thead>
                                            <tr>
                                                <th className="row-number-cell">#</th>
                                                {activeSheet.rows[0].map((cell, index) => (
                                                    <th key={`head-${index}`}>
                                                        {cell || `Column ${index + 1}`}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeSheet.rows.slice(1).map((row, rowIndex) => (
                                                <tr key={`row-${rowIndex}`}>
                                                    <td className="row-number-cell">
                                                        {rowIndex + 1}
                                                    </td>
                                                    {activeSheet.rows[0].map((_, columnIndex) => (
                                                        <td key={`cell-${rowIndex}-${columnIndex}`}>
                                                            {row[columnIndex] !== undefined
                                                                ? String(row[columnIndex])
                                                                : ""}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="office-preview-empty">
                                        <span>This sheet is empty.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 5. PPTX — trích xuất text từng slide trong file OOXML */}
            {currentViewer === "slides" && !isLegacyPpt && (
                <div className="office-preview-shell">
                    {loadingOfficePreview ? (
                        <div className="docs-loading-placeholder">
                            <Loader2 size={24} className="spin-animate" />
                            <span>Opening presentation...</span>
                        </div>
                    ) : officePreviewError ? (
                        <div className="office-preview-empty">
                            {getDocIcon("pptx", 40)}
                            <strong>Presentation preview unavailable</strong>
                            <span>{officePreviewError}</span>
                        </div>
                    ) : activeSlide ? (
                        <div className="pptx-preview">
                            <div className="office-preview-heading">
                                <div>
                                    <span className="office-preview-kicker">
                                        <Presentation size={13} /> Presentation preview
                                    </span>
                                    <strong>
                                        Slide {activeSlide.number} of {presentationSlides.length}
                                    </strong>
                                </div>
                                <div className="pptx-slide-controls">
                                    <button
                                        type="button"
                                        disabled={activePptxSlide === 0}
                                        onClick={() => setActivePptxSlide((prev) => prev - 1)}
                                        title="Previous slide"
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={activePptxSlide === presentationSlides.length - 1}
                                        onClick={() => setActivePptxSlide((prev) => prev + 1)}
                                        title="Next slide"
                                    >
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            </div>
                            <div className="pptx-slide-stage">
                                <div className="pptx-slide-card">
                                    {activeSlide.text.length ? (
                                        activeSlide.text.map((text, index) =>
                                            index === 0 ? (
                                                <h3 key={`slide-title-${index}`}>{text}</h3>
                                            ) : (
                                                <p key={`slide-text-${index}`}>{text}</p>
                                            ),
                                        )
                                    ) : (
                                        <span>
                                            This slide has no extractable text. Download the file to
                                            view graphics.
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="pptx-slide-dots">
                                {presentationSlides.map((slide, index) => (
                                    <button
                                        key={slide.number}
                                        type="button"
                                        className={index === activePptxSlide ? "active" : ""}
                                        onClick={() => setActivePptxSlide(index)}
                                        aria-label={`Go to slide ${slide.number}`}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="office-preview-empty">
                            {getDocIcon("pptx", 40)}
                            <span>No slides found in this presentation.</span>
                        </div>
                    )}
                </div>
            )}

            {/* 6. Không xem trước được (ppt cũ, zip, ảnh không hỗ trợ...): tải về */}
            {!currentViewer || isLegacyPpt ? (
                <div className="preview-paper-sheet">
                    <div className="binary-doc-preview-card">
                        <div className="binary-card-glyph">
                            {getDocIcon(currentExt, 48)}
                        </div>
                        <h3>{selectedDoc.title || selectedDoc.filename}</h3>
                        <p>
                            {isLegacyPpt
                                ? ".ppt is a legacy binary format — convert it to .pptx or download it to view the slides."
                                : `${
                                      formatLabelOf(selectedDoc) || "This format"
                                  } cannot be rendered in the browser. Download the file to review offline.`}
                        </p>
                        <div className="binary-action-row">
                            <button
                                type="button"
                                onClick={() => handleDownloadDocument(selectedDoc)}
                                className="btn-download-primary"
                            >
                                <Download size={14} />
                                <span>Download File</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );

    return (
        <div
            className={`documents-tab-bounds ${isFullscreen ? "documents-fullscreen" : ""}`}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="document-drop-overlay">
                    <UploadCloud size={34} />
                    <strong>Thả giáo trình hoặc tài liệu để tải lên</strong>
                    <span>PDF, DOCX, XLSX, PPTX, MD hoặc TXT</span>
                </div>
            )}

            {actionNotice && (
                <div className="document-action-notice">
                    <Check size={14} /> {actionNotice}
                </div>
            )}

            {/* Menu nổi tương tác thông minh khi người học bôi đen văn bản */}
            {selectionCoord && (
                <div
                    className="selection-ai-floating-menu"
                    style={{ top: `${selectionCoord.top}px`, left: `${selectionCoord.left}px` }}
                >
                    <button type="button" onClick={() => handleSelectionAction("explain")}>
                        <Sparkles size={12} /> Giải thích
                    </button>
                    <button type="button" onClick={() => handleSelectionAction("quiz")}>
                        <HelpCircle size={12} /> Tạo Quiz
                    </button>
                    <button type="button" onClick={() => handleSelectionAction("ask")}>
                        <MessageSquareQuote size={12} /> Hỏi AI Tutor
                    </button>
                </div>
            )}

            {/* Header Banner */}
            <div className="documents-header-banner">
                <div>
                    <h2>Documents</h2>
                    <span>
                        View course handouts, lecture notes, and study guides with your AI Tutor
                    </span>
                </div>
                <div className="banner-actions-group documents-header-button">
                    <button
                        type="button"
                        className="btn-upload-document"
                        disabled={isUploading}
                        onClick={() => fileUploadRef.current?.click()}
                    >
                        {isUploading ? (
                            <Loader2 size={14} className="spin-animate" />
                        ) : (
                            <UploadCloud size={14} />
                        )}
                        <span>{isUploading ? "Uploading..." : "Upload Material"}</span>
                    </button>
                    <input
                        ref={fileUploadRef}
                        type="file"
                        multiple
                        accept=".pdf,.txt,.md,.markdown,.rst,.log,.json,.csv"
                        hidden
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            {/* Split Screen Master-Detail Layout */}
            <div className="documents-split-container">
                {/* CỘT TRÁI: DANH SÁCH TÀI LIỆU */}
                <div className="documents-sidebar-list">
                    <div className="docs-search-bar">
                        <Search size={14} className="search-glyph" />
                        <input
                            type="text"
                            placeholder="Search by title, course..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="docs-list-toolbar">
                        <label className="select-all-docs">
                            <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={handleSelectAllVisible}
                            />
                            <span>
                                {selectedIds.size ? `${selectedIds.size} selected` : "Select all"}
                            </span>
                        </label>
                        <button
                            type="button"
                            className={`icon-control ${isAdvancedFiltersOpen ? "active" : ""}`}
                            title="Advanced filters"
                            onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
                        >
                            <Filter size={14} />
                        </button>
                        <CustomSelector
                            className="docs-sort-selector"
                            options={[
                                { value: "recent", label: "Recent" },
                                { value: "name", label: "Name" },
                                { value: "size", label: "Size" },
                            ]}
                            value={sortBy}
                            onChange={(val) => setSortBy(val)}
                            placeholder="Sort by..."
                        />
                    </div>

                    {isAdvancedFiltersOpen && (
                        <div className="docs-advanced-filters">
                            <CustomSelector
                                className="docs-course-filter-selector"
                                options={[
                                    { value: "all", label: "All courses" },
                                    ...availableCourses.map((course) => ({
                                        value: course,
                                        label: course,
                                    })),
                                ]}
                                value={courseFilter}
                                onChange={(val) => setCourseFilter(val)}
                                placeholder="All courses"
                            />
                            <span className="filter-help-text">
                                <Star size={12} /> Favorites are highlighted
                            </span>
                        </div>
                    )}

                    {selectedIds.size > 0 && (
                        <div className="bulk-actions-bar">
                            <span>{selectedIds.size} tài liệu</span>
                            <button type="button" onClick={handleBulkMarkCompleted}>
                                <CheckCircle size={12} /> Đã học xong
                            </button>
                            <button type="button" onClick={handleBulkDelete}>
                                <Trash2 size={12} /> Delete
                            </button>
                            <button
                                type="button"
                                className="bulk-clear"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    <div className="docs-type-filters">
                        {["all", "pdf", "docx", "xlsx", "pptx", "md"].map((type) => {
                            const label =
                                type === "all"
                                    ? "ALL"
                                    : type === "docx"
                                      ? "WORD"
                                      : type === "md"
                                        ? "MD"
                                        : type.toUpperCase();
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    className={`type-pill ${typeFilter === type ? "active" : ""}`}
                                    onClick={() => setTypeFilter(type)}
                                    title={
                                        type === "docx"
                                            ? "Word documents (.doc, .docx)"
                                            : type === "xlsx"
                                              ? "Spreadsheets (.xls, .xlsx, .csv)"
                                              : type === "pptx"
                                                ? "Presentations (.ppt, .pptx)"
                                                : type === "md"
                                                  ? "Markdown"
                                                  : undefined
                                    }
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="docs-scroll-track">
                        {isLoading ? (
                            <div className="docs-loading-placeholder">
                                <Loader2 size={24} className="spin-animate" />
                                <span>Loading documents...</span>
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className="docs-empty-placeholder">
                                <FileText size={28} color="var(--icon-faint)" />
                                <span>No materials found</span>
                            </div>
                        ) : (
                            filteredDocs.map((doc) => {
                                const isSelected = selectedDoc?.id === doc.id;
                                const docType = extOf(doc);
                                const docTitle = doc.title || doc.filename;
                                const docSize = doc.size || doc.fileSizeFormatted;
                                const isCompleted = completedDocIds.has(doc.id);

                                return (
                                    <div
                                        key={doc.id}
                                        className={`doc-item-entry ${isSelected ? "selected" : ""}`}
                                        onClick={() => setSelectedDoc(doc)}
                                    >
                                        <input
                                            className="doc-select-checkbox"
                                            type="checkbox"
                                            checked={selectedIds.has(doc.id)}
                                            onChange={(e) => handleToggleSelected(doc.id, e)}
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label={`Select ${docTitle}`}
                                        />
                                        <div className="doc-icon-wrapper" title={formatLabelOf(doc)}>
                                            {getDocIcon(docType, 26)}
                                        </div>
                                        <div className="doc-meta-column">
                                            <div className="doc-title-row">
                                                <strong className="doc-title-text" title={docTitle}>
                                                    {docTitle}
                                                </strong>
                                            </div>
                                            <div className="doc-sub-details">
                                                <span className="doc-course-tag">
                                                    {doc.courseCode || "GEN"}
                                                </span>
                                                <span className="doc-format-tag">
                                                    {formatLabelOf(doc)}
                                                </span>
                                                <span>{docSize}</span>
                                                <span>•</span>
                                                {isCompleted ? (
                                                    <span className="doc-ready-status completed">
                                                        <CheckCircle2 size={11} /> Đã học
                                                    </span>
                                                ) : (
                                                    <span className="doc-ready-status ready">
                                                        Sẵn sàng học
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={`btn-favorite-doc ${favoriteIds.has(doc.id) ? "active" : ""}`}
                                            title="Favorite document"
                                            onClick={(e) => handleToggleFavorite(doc.id, e)}
                                        >
                                            <Star
                                                size={13}
                                                fill={
                                                    favoriteIds.has(doc.id)
                                                        ? "currentColor"
                                                        : "none"
                                                }
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-trash-doc"
                                            title="Delete document"
                                            onClick={(e) => handleDeleteDocument(doc.id, e)}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="docs-sidebar-footer">
                        <div className="storage-meter-row">
                            <span>Total Files</span>
                            <strong>{documents.length} Available</strong>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: XEM TRƯỚC TÀI LIỆU */}
                <div className={`documents-preview-canvas theme-${readingTheme}`}>
                    {selectedDoc ? (
                        <>
                            <div className="preview-top-toolbar">
                                <div className="preview-file-identity">
                                    {getDocIcon(currentExt, 24)}
                                    <div>
                                        <strong>{selectedDoc.title || selectedDoc.filename}</strong>
                                        <small>
                                            {selectedDoc.size || selectedDoc.fileSizeFormatted}
                                            {selectedDoc.uploadedAt
                                                ? ` • Uploaded ${selectedDoc.uploadedAt}`
                                                : ""}
                                        </small>
                                    </div>
                                </div>

                                <div className="preview-controls-cluster">
                                    {/* Bộ chuyển màu nền bảo vệ mắt */}
                                    <div
                                        className="theme-toggle-cluster"
                                        title="Chế độ màu nền đọc sách"
                                    >
                                        <button
                                            type="button"
                                            className={`btn-theme-glyph ${readingTheme === "light" ? "active" : ""}`}
                                            onClick={() => setReadingTheme("light")}
                                            title="Nền sáng"
                                        >
                                            <Sun size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-theme-glyph sepia ${readingTheme === "sepia" ? "active" : ""}`}
                                            onClick={() => setReadingTheme("sepia")}
                                            title="Nền giấy ngà (Chống mỏi mắt)"
                                        >
                                            <Coffee size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-theme-glyph dark ${readingTheme === "dark" ? "active" : ""}`}
                                            onClick={() => setReadingTheme("dark")}
                                            title="Nền tối dịu mắt"
                                        >
                                            <Moon size={13} />
                                        </button>
                                    </div>

                                    <div className="toolbar-divider" />

                                    <div className="zoom-controls">
                                        <button
                                            type="button"
                                            className="btn-toolbar-glyph"
                                            onClick={() =>
                                                setZoomLevel((prev) => Math.max(70, prev - 10))
                                            }
                                            title="Zoom Out"
                                        >
                                            <ZoomOut size={14} />
                                        </button>
                                        <span className="zoom-percentage">{zoomLevel}%</span>
                                        <button
                                            type="button"
                                            className="btn-toolbar-glyph"
                                            onClick={() =>
                                                setZoomLevel((prev) => Math.min(150, prev + 10))
                                            }
                                            title="Zoom In"
                                        >
                                            <ZoomIn size={14} />
                                        </button>
                                    </div>

                                    <div className="toolbar-divider" />

                                    {/* Nút mở Modal Ghi chú Fullscreen 2 nửa */}
                                    <button
                                        type="button"
                                        className="btn-toolbar-glyph active-note-btn"
                                        onClick={handleOpenNotesModal}
                                        title="Mở không gian học tập & Ghi chú toàn màn hình"
                                    >
                                        <StickyNote size={14} />
                                    </button>

                                    <button
                                        type="button"
                                        className="btn-ai-query-file"
                                        onClick={handleAskTutor}
                                        title="Chat with Tutor using this document"
                                    >
                                        <Sparkles size={13} />
                                        <span>Ask Tutor</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="btn-toolbar-glyph"
                                        title="Fullscreen preview"
                                        onClick={() => setIsFullscreen((prev) => !prev)}
                                    >
                                        <Maximize2 size={14} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDownloadDocument(selectedDoc)}
                                        className="btn-toolbar-glyph"
                                        title="Download Material"
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="document-insights-bar">
                                <div className="learning-status-pill-group">
                                    <button
                                        type="button"
                                        className={`btn-mark-completed ${isCurrentDocCompleted ? "completed" : ""}`}
                                        onClick={() => handleToggleCompleted(selectedDoc.id)}
                                    >
                                        <CheckCircle2 size={13} />
                                        <span>
                                            {isCurrentDocCompleted
                                                ? "Đã hoàn thành bài học"
                                                : "Đánh dấu đã học"}
                                        </span>
                                    </button>
                                </div>

                                <div className="content-search-bar">
                                    <Search size={13} />
                                    <input
                                        type="search"
                                        placeholder="Find in document..."
                                        value={contentSearchQuery}
                                        onChange={(e) => setContentSearchQuery(e.target.value)}
                                    />
                                    {contentSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setContentSearchQuery("")}
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {currentViewer === "markdown" && (
                                    <div
                                        className="markdown-view-toggle"
                                        role="group"
                                        aria-label="Markdown view mode"
                                    >
                                        <button
                                            type="button"
                                            className={markdownViewMode === "code" ? "active" : ""}
                                            onClick={() => setMarkdownViewMode("code")}
                                            title="View Markdown source"
                                        >
                                            <Code2 size={13} />
                                            <span>Code</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={
                                                markdownViewMode === "preview" ? "active" : ""
                                            }
                                            onClick={() => setMarkdownViewMode("preview")}
                                            title="View rendered Markdown"
                                        >
                                            <Eye size={13} />
                                            <span>Preview</span>
                                        </button>
                                    </div>
                                )}

                                <div className="document-ai-actions">
                                    <div
                                        ref={documentToolsMenuRef}
                                        className="document-tools-menu-wrap"
                                    >
                                        <button
                                            type="button"
                                            className={`document-more-trigger ${isDocumentToolsOpen ? "active" : ""}`}
                                            title="More document tools"
                                            aria-expanded={isDocumentToolsOpen}
                                            onClick={() => setIsDocumentToolsOpen((prev) => !prev)}
                                        >
                                            <MoreHorizontal size={15} />
                                        </button>
                                        {isDocumentToolsOpen && (
                                            <div className="document-tools-menu">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleDocumentAction("summarize");
                                                        setIsDocumentToolsOpen(false);
                                                    }}
                                                >
                                                    <Sparkles size={13} /> Tóm tắt bài học
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleDocumentAction("flashcards");
                                                        setIsDocumentToolsOpen(false);
                                                    }}
                                                >
                                                    <BookOpen size={13} /> Tạo Flashcards
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleDocumentAction("quiz");
                                                        setIsDocumentToolsOpen(false);
                                                    }}
                                                >
                                                    <FolderOpen size={13} /> Tạo đề luyện thi
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        showActionNotice(
                                                            "Đã sao chép trích dẫn tài liệu.",
                                                        );
                                                        setIsDocumentToolsOpen(false);
                                                    }}
                                                >
                                                    <Check size={13} /> Sao chép trích dẫn
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Viewport hiển thị tài liệu ở trang chính */}
                            <div
                                className="preview-main-workspace"
                                onMouseUp={handleMouseUpSelection}
                            >
                                {renderDocumentViewer(false)}
                            </div>
                        </>
                    ) : (
                        <div className="no-document-selected">
                            <BookOpen size={36} color="var(--icon-faint)" />
                            <p>Select any learning material from the list to preview</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* MODAL FULL MÀN HÌNH: 1 BÊN TÀI LIỆU - 1 BÊN GHI CHÚ STACK */}
            {/* ======================================================== */}
            {isNotesModalOpen && selectedDoc && (
                <div className="fullscreen-notes-modal-backdrop">
                    <div className="fullscreen-notes-modal-container">
                        {/* Thanh Topbar của Modal */}
                        <div className="notes-modal-topbar">
                            <div className="modal-doc-identity">
                                {getDocIcon(currentExt, 22)}
                                <strong>{selectedDoc.title || selectedDoc.filename}</strong>
                                <span className="modal-course-badge">
                                    {selectedDoc.courseCode || "GEN"}
                                </span>
                            </div>
                            <div className="modal-topbar-actions">
                                <button
                                    type="button"
                                    className="btn-modal-action-exit"
                                    onClick={() => setIsNotesModalOpen(false)}
                                    title="Đóng không gian ghi chú"
                                >
                                    <Minimize2 size={16} />
                                    <span>Thu nhỏ & Đóng</span>
                                </button>
                            </div>
                        </div>

                        {/* Thân Modal chia đôi 50/50 */}
                        <div className="notes-modal-split-body">
                            {/* NỬA TRÁI: PREVIEW TÀI LIỆU */}
                            <div
                                className="modal-half-left-viewer"
                                onMouseUp={handleMouseUpSelection}
                            >
                                {renderDocumentViewer(true)}
                            </div>

                            {/* NỬA PHẢI: WORKSPACE GHI CHÚ VỚI STACK FILE */}
                            <div className="modal-half-right-notes">
                                {/* Cột con bên phải: Soạn thảo ghi chú hiện tại */}
                                <div className="notes-editor-pane">
                                    <div className="editor-pane-header">
                                        <div className="editor-title-wrap">
                                            <input
                                                type="text"
                                                className="note-title-inline-input"
                                                placeholder="Tiêu đề ghi chú..."
                                                value={noteTitleInput}
                                                onChange={(e) => setNoteTitleInput(e.target.value)}
                                            />
                                            <CustomSelector
                                                options={NOTE_TYPES}
                                                value={noteTypeInput}
                                                onChange={(val) => setNoteTypeInput(val)}
                                            />
                                        </div>

                                        <div className="editor-header-buttons">
                                            <button
                                                type="button"
                                                className="btn-new-note-action"
                                                onClick={handleCreateNewNote}
                                                title="Tạo ghi chú mới"
                                                aria-label="Tạo ghi chú mới"
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-save-note-action"
                                                onClick={handleSaveCurrentNote}
                                                title="Lưu lại ghi chú"
                                                aria-label="Lưu lại ghi chú"
                                            >
                                                <Save size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        className="note-body-textarea"
                                        placeholder="Ghi lại các công thức, lưu ý quan trọng, câu hỏi thắc mắc khi đang đọc tài liệu..."
                                        value={noteContentInput}
                                        onChange={(e) => setNoteContentInput(e.target.value)}
                                    />
                                </div>

                                {/* Cột con bên phải: STACK CÁC FILE GHI CHÚ CŨ */}
                                <div className="notes-stack-sidebar">
                                    <div className="stack-sidebar-header">
                                        <StickyNote size={15} />
                                        <strong>Kho ghi chú ({currentDocNotesList.length})</strong>
                                    </div>

                                    <div className="notes-stack-cards-track">
                                        {currentDocNotesList.length === 0 ? (
                                            <div className="empty-notes-stack">
                                                <StickyNote size={24} color="var(--text-faint)" />
                                                <span>Chưa có ghi chú nào cho tài liệu này.</span>
                                            </div>
                                        ) : (
                                            currentDocNotesList.map((note) => {
                                                const isActive = note.id === activeNoteId;
                                                return (
                                                    <div
                                                        key={note.id}
                                                        className={`note-stack-card-item ${isActive ? "active-card" : ""}`}
                                                        onClick={() =>
                                                            handleSelectNoteFromStack(note)
                                                        }
                                                    >
                                                        <div className="stack-card-top">
                                                            <div className="stack-card-title-line">
                                                                <strong title={note.title}>
                                                                    {note.title}
                                                                </strong>
                                                                {renderNoteTypeBadge(
                                                                    note.type || "general",
                                                                )}
                                                            </div>
                                                            <div className="note-card-actions">
                                                                <button
                                                                    type="button"
                                                                    className="btn-rename-card-note"
                                                                    onClick={(e) =>
                                                                        handleOpenEditNoteModal(
                                                                            note,
                                                                            e,
                                                                        )
                                                                    }
                                                                    title="Đổi tên và phân loại ghi chú"
                                                                >
                                                                    <Pencil size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-delete-card-note"
                                                                    onClick={(e) =>
                                                                        handleDeleteNoteFromStack(
                                                                            note.id,
                                                                            e,
                                                                        )
                                                                    }
                                                                    title="Xóa ghi chú này"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="stack-card-snippet">
                                                            {note.content || "Chưa có nội dung..."}
                                                        </p>
                                                        <div className="stack-card-bottom">
                                                            <Clock size={11} />
                                                            <span>
                                                                {note.updatedAt || "Vừa xong"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* POPUP MODAL ĐỔI TÊN & PHÂN LOẠI TYPE GHI CHÚ            */}
            {/* ======================================================== */}
            {editingNoteModal && (
                <div
                    className="modal-backdrop-scrim note-edit-popup-backdrop"
                    onClick={() => setEditingNoteModal(null)}
                >
                    <div className="note-edit-dialog-card" onClick={(e) => e.stopPropagation()}>
                        <div className="note-edit-dialog-header">
                            <div className="dialog-title-group">
                                <Pencil size={15} className="text-emerald" />
                                <strong>Chỉnh sửa ghi chú</strong>
                            </div>
                            <button
                                type="button"
                                className="btn-close-edit-dialog"
                                onClick={() => setEditingNoteModal(null)}
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleConfirmEditNoteModal}
                            className="note-edit-dialog-body"
                        >
                            <div className="dialog-form-unit">
                                <label>Tên ghi chú</label>
                                <input
                                    type="text"
                                    value={editModalTitle}
                                    onChange={(e) => setEditModalTitle(e.target.value)}
                                    placeholder="Nhập tên mới cho ghi chú..."
                                    autoFocus
                                />
                            </div>

                            <div className="dialog-form-unit">
                                <label>Loại ghi chú (Phân loại)</label>
                                <div className="note-types-pill-selection">
                                    {NOTE_TYPES.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            className={`type-choice-chip ${t.color} ${editModalType === t.id ? "selected" : ""}`}
                                            onClick={() => setEditModalType(t.id)}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="dialog-footer-actions">
                                <button
                                    type="button"
                                    className="btn-cancel-dialog"
                                    onClick={() => setEditingNoteModal(null)}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn-confirm-dialog">
                                    Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;
