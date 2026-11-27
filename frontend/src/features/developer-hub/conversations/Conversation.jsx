import { useEffect, useState } from "react";
import {
    RotateCw,
    Archive,
    ArchiveRestore,
    ExternalLink,
    Bookmark,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { chatApi } from "@/api";
import { useToast } from "@/context/ToastContext.jsx";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import SearchPill from "@/components/ui/SearchPill.jsx";
import "@/features/developer-hub/conversations/Conversation.css";
import { getSessionUserId } from "@/lib/session";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 350;


// Lựa chọn lọc trạng thái dùng CustomSelector chung (không dùng thẻ select mặc định)
const STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Active", color: "green" },
    { value: "ARCHIVED", label: "Archived", color: "amber" },
    { value: "ALL", label: "All", color: "blue" },
];

const formatCompactNumber = (value) => {
    const number = Number(value) || 0;
    if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
    if (number >= 1_000) return `${(number / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    return String(number);
};

const formatCost = (value) => `$${(Number(value) || 0).toFixed(4)}`;

const formatActivity = (instant) => {
    if (!instant) return "—";
    const date = new Date(instant);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

// Gộp nhiều lần gõ phím liên tiếp thành 1 lần gọi API
const useDebouncedValue = (value, delay) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
};

// Nhãn trạng thái hiển thị ở cột đầu tiên
const getStatusBadge = (session) => {
    if (session.archived) {
        return { label: "Archived", tone: "archived" };
    }
    if (session.bookmarked) {
        return { label: "Bookmarked", tone: "bookmarked" };
    }
    const updated = new Date(session.updatedAt || session.createdAt || 0).getTime();
    if (updated && Date.now() - updated < 24 * 60 * 60 * 1000) {
        return { label: "Recently active", tone: "active" };
    }
    return { label: "Active", tone: "muted" };
};

const truncate = (text, max = 24) => {
    if (!text) return "—";
    return text.length > max ? `${text.slice(0, max)}...` : text;
};

const toConversationViewModel = (session) => ({
    id: session.id,
    title: session.title || "New Chat",
    projectId: session.projectId || null,
    project: session.projectName || session.workspaceName || "—",
    model: session.model || "—",
    tokensCost: `${formatCompactNumber(session.totalTokens)} · ${formatCost(session.totalCost)}`,
    totalTokens: session.totalTokens || 0,
    lastActivity: formatActivity(session.updatedAt || session.createdAt),
    archived: Boolean(session.archived),
    bookmarked: Boolean(session.bookmarked),
    status: getStatusBadge(session),
});

const Conversation = ({ onOpenConversation }) => {
    const { showToast } = useToast();
    const [conversations, setConversations] = useState([]);
    const [counts, setCounts] = useState({ active: 0, archived: 0, all: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

    // Đổi từ khóa hoặc bộ lọc thì quay về trang đầu
    useEffect(() => {
        setPage(0);
    }, [debouncedSearch, statusFilter]);

    const { loading, error, reload } = useAsyncData(
        () =>
            chatApi.listConversations({
                ownerId: getSessionUserId(),
                status: statusFilter,
                search: debouncedSearch.trim() || undefined,
                page,
                size: PAGE_SIZE,
            }),
        [debouncedSearch, statusFilter, page],
        {
            enabled: Boolean(getSessionUserId()),
            errorMessage: "Unable to load conversations.",
            onSuccess: (data) => {
                setConversations((data?.items || []).map(toConversationViewModel));
                setTotalPages(data?.totalPages || 0);
                setTotalElements(data?.totalElements || 0);
                setCounts({
                    active: data?.activeCount || 0,
                    archived: data?.archivedCount || 0,
                    all: data?.allCount || 0,
                });
            },
            onError: () => {
                setConversations([]);
                setCounts({ active: 0, archived: 0, all: 0 });
            },
        },
    );

    // Đổi trạng thái: cập nhật state + tải lại danh sách ngay
    const applySessionUpdate = (updated) => {
        setConversations((prev) => {
            const inCurrentFilter =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && !updated.archived) ||
                (statusFilter === "ARCHIVED" && updated.archived);

            if (!inCurrentFilter) {
                return prev.filter((item) => item.id !== updated.id);
            }
            return prev.map((item) =>
                item.id === updated.id ? toConversationViewModel(updated) : item,
            );
        });
        reload();
    };

    const handleToggleArchive = async (row) => {
        try {
            const updated = await chatApi.setArchived(row.id, !row.archived);
            applySessionUpdate(updated);
        } catch (err) {
            showToast(err.message || "Unable to archive conversation.", "error");
        }
    };

    const handleToggleBookmark = async (row) => {
        try {
            const updated = await chatApi.toggleBookmark(row.id);
            applySessionUpdate(updated);
        } catch (err) {
            showToast(err.message || "Unable to bookmark conversation.", "error");
        }
    };

    return (
        <div className="vibe-conversations-viewport">
            {/* Header hàng trên */}
            <div className="conversations-top-banner">
                <div className="banner-title-col">
                    <h2>Your conversations</h2>
                    <span>
                        {counts.all} conversations across all projects · {counts.active} active ·{" "}
                        {counts.archived} archived.
                    </span>
                </div>
                <button
                    type="button"
                    className="btn-refresh-convo"
                    title="Refresh"
                    onClick={() => reload()}
                >
                    <RotateCw size={15} />
                </button>
            </div>

            {/* Bộ điều khiển lọc */}
            <div className="conversations-filter-bar">
                <SearchPill
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search conversations..."
                />

                {/* Dropdown dùng CustomSelector chung */}
                <CustomSelector
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    placeholder="Filter status..."
                />

                <span className="conversations-result-count">
                    {loading ? "—" : `${totalElements} result${totalElements === 1 ? "" : "s"}`}
                </span>
            </div>

            {loading && <p className="conversations-loading-text">Loading conversations...</p>}
            {!loading && error && (
                <p role="alert" className="conversations-error-text">
                    {error}
                </p>
            )}

            {/* Bảng dữ liệu hội thoại */}
            {!loading && !error && (
                <div className="conversations-table-wrapper">
                    <table className="vibe-convo-table">
                        <thead>
                            <tr>
                                <th className="th-status">Status</th>
                                <th className="th-title">Conversation</th>
                                <th className="th-project">Project</th>
                                <th className="th-model">Model</th>
                                <th className="th-tokens">Tokens · Cost</th>
                                <th className="th-activity">Last activity</th>
                                <th className="th-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conversations.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="td-empty">
                                        No conversations found.
                                    </td>
                                </tr>
                            ) : (
                                conversations.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="convo-table-row"
                                        onClick={() =>
                                            onOpenConversation && onOpenConversation(row)
                                        }
                                    >
                                        {/* Cột Status */}
                                        <td className="td-status">
                                            <span
                                                className={`convo-status-badge ${row.status.tone}`}
                                                title={`Last activity: ${row.lastActivity}`}
                                            >
                                                {row.status.label}
                                            </span>
                                        </td>

                                        {/* Cột Conversation Title */}
                                        <td className="td-title">
                                            <div className="convo-title-cell">
                                                <Bookmark
                                                    size={13}
                                                    className={
                                                        row.bookmarked
                                                            ? "convo-flag-glyph bookmarked"
                                                            : "convo-flag-glyph"
                                                    }
                                                />
                                                <strong title={row.title}>{row.title}</strong>
                                            </div>
                                        </td>

                                        {/* Cột Project */}
                                        <td className="td-project">
                                            <span>{row.project}</span>
                                        </td>

                                        {/* Cột Model */}
                                        <td className="td-model">
                                            <span title={row.model}>{truncate(row.model)}</span>
                                        </td>

                                        {/* Cột Tokens · Cost */}
                                        <td className="td-tokens">
                                            <span>{row.tokensCost}</span>
                                        </td>

                                        {/* Cột Last activity */}
                                        <td className="td-activity">
                                            <span>{row.lastActivity}</span>
                                        </td>

                                        {/* Cột Actions */}
                                        <td
                                            className="td-actions"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="actions-cluster">
                                                <button
                                                    type="button"
                                                    className="btn-action-glyph"
                                                    title={
                                                        row.bookmarked
                                                            ? "Remove bookmark"
                                                            : "Bookmark conversation"
                                                    }
                                                    onClick={() => handleToggleBookmark(row)}
                                                >
                                                    <Bookmark
                                                        size={14}
                                                        fill={
                                                            row.bookmarked ? "currentColor" : "none"
                                                        }
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action-glyph"
                                                    title={
                                                        row.archived
                                                            ? "Restore conversation"
                                                            : "Archive conversation"
                                                    }
                                                    onClick={() => handleToggleArchive(row)}
                                                >
                                                    {row.archived ? (
                                                        <ArchiveRestore size={14} />
                                                    ) : (
                                                        <Archive size={14} />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action-glyph"
                                                    title="Open in new window"
                                                    onClick={() =>
                                                        onOpenConversation &&
                                                        onOpenConversation(row)
                                                    }
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Phân trang phía server */}
                    {totalPages > 1 && (
                        <div className="conversations-pagination">
                            <span className="pagination-summary">
                                Page {page + 1} of {totalPages}
                            </span>
                            <div className="pagination-controls">
                                <button
                                    type="button"
                                    className="btn-action-glyph"
                                    title="Previous page"
                                    disabled={page === 0}
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                <button
                                    type="button"
                                    className="btn-action-glyph"
                                    title="Next page"
                                    disabled={page + 1 >= totalPages}
                                    onClick={() => setPage((prev) => prev + 1)}
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Conversation;
