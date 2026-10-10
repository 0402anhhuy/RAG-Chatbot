import { useState } from "react";
import {
    Search,
    RotateCw,
    Archive,
    ExternalLink,
    CheckSquare,
    Square,
    Bookmark,
} from "lucide-react";
import "./Conversation.css";

const CONVERSATIONS_DATA = [
    {
        id: "c1",
        status: "success",
        title: "Fix Math.Clamp ArgumentException",
        project: "aivibecode",
        model: "amazon-bedrock-star...",
        tokensCost: "5.28M · $8.0391",
        lastActivity: "Oct 9, 07:17 PM",
    },
    {
        id: "c2",
        status: "success",
        title: "VibeFlow support for Jira PM pain points",
        project: "jira-skill",
        model: "fpt-starter-vn/DeepS...",
        tokensCost: "572.7k · $0.1645",
        lastActivity: "Oct 9, 03:47 PM",
    },
    {
        id: "c3",
        status: "success",
        title: "Start a LIVE preview of my app in this se:",
        project: "ShoeStore",
        model: "fpt-starter-vn/DeepS...",
        tokensCost: "245.1k · $0.0925",
        lastActivity: "Oct 9, 02:15 PM",
    },
    {
        id: "c4",
        status: "idle",
        title: "Start a LIVE preview of my app in this se:",
        project: "DMS AI Hub",
        model: "amazon-bedrock-star...",
        tokensCost: "4.19M · $1.7698",
        lastActivity: "Oct 8, 06:40 PM",
    },
    {
        id: "c5",
        status: "success",
        title: "Start a LIVE preview of my app in this se:",
        project: "ShoeStore",
        model: "fpt-starter-vn/DeepS...",
        tokensCost: "72.4k · $0.0159",
        lastActivity: "Oct 8, 03:29 PM",
    },
    {
        id: "c6",
        status: "success",
        title: "Start a LIVE preview of my app in this se:",
        project: "ShoeStore",
        model: "fpt-starter-vn/DeepS...",
        tokensCost: "72.2k · $0.0168",
        lastActivity: "Oct 8, 08:46 AM",
    },
    {
        id: "c7",
        status: "success",
        title: "Fix missing old/new code change diffs",
        project: "aivibecode",
        model: "amazon-bedrock-star...",
        tokensCost: "2.61M · $2.8146",
        lastActivity: "Oct 7, 06:41 PM",
    },
    {
        id: "c8",
        status: "success",
        title: "Start a LIVE preview of my app in this se:",
        project: "ShoeStore",
        model: "fpt-starter-vn/DeepS...",
        tokensCost: "69.9k · $0.0155",
        lastActivity: "Oct 7, 02:47 PM",
    },
    {
        id: "c9",
        status: "success",
        title: "Start a LIVE preview of my app in this se:",
        project: "ShoeStore",
        model: "fpt-starter-vn/DeepS...",
        tokensCost: "74.4k · $0.0187",
        lastActivity: "Oct 7, 02:36 PM",
    },
    {
        id: "c10",
        status: "success",
        title: "Refine plan for 2-member team",
        project: "WebApp",
        model: "fpt-starter-vn/DeepS...",
        tokensCost: "33.3k · $0.0092",
        lastActivity: "Oct 7, 01:17 PM",
    },
    {
        id: "c11",
        status: "success",
        title: "Role-based work plan for 3-member te",
        project: "WebApp",
        model: "fpt-starter-vn/DeepS...",
        tokensCost: "50.3k · $0.0111",
        lastActivity: "Oct 7, 01:10 PM",
    },
];

const Conversation = ({ onOpenConversation }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Active");

    const filteredConversations = CONVERSATIONS_DATA.filter((item) => {
        const matchesSearch =
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.project.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="vibe-conversations-viewport">
            {/* Header hàng trên */}
            <div className="conversations-top-banner">
                <div className="banner-title-col">
                    <h2>Your conversations</h2>
                    <span>71 conversations across all projects.</span>
                </div>
                <button type="button" className="btn-refresh-convo" title="Refresh">
                    <RotateCw size={15} />
                </button>
            </div>

            {/* Bộ điều khiển lọc */}
            <div className="conversations-filter-bar">
                <div className="search-pill-container">
                    <Search size={14} className="search-glyph-muted" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    className="filter-select-pill"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                    <option value="All">All</option>
                </select>
            </div>

            {/* Bảng dữ liệu hội thoại */}
            <div className="conversations-table-wrapper">
                <table className="vibe-convo-table">
                    <thead>
                        <tr>
                            <th className="th-status">Status ⇕</th>
                            <th className="th-title">Conversation ⇕</th>
                            <th className="th-project">Project ⇕</th>
                            <th className="th-model">Model</th>
                            <th className="th-tokens">Tokens · Cost ⇕</th>
                            <th className="th-activity">Last activity ▾</th>
                            <th className="th-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredConversations.map((row) => (
                            <tr
                                key={row.id}
                                className="convo-table-row"
                                onClick={() => onOpenConversation && onOpenConversation(row)}
                            >
                                {/* Cột Status */}
                                <td className="td-status">
                                    {row.status === "success" ? (
                                        <CheckSquare size={15} className="glyph-status-success" />
                                    ) : (
                                        <Square size={15} className="glyph-status-idle" />
                                    )}
                                </td>

                                {/* Cột Conversation Title */}
                                <td className="td-title">
                                    <div className="convo-title-cell">
                                        <Bookmark size={13} className="convo-flag-glyph" />
                                        <strong title={row.title}>{row.title}</strong>
                                    </div>
                                </td>

                                {/* Cột Project */}
                                <td className="td-project">
                                    <span>{row.project}</span>
                                </td>

                                {/* Cột Model */}
                                <td className="td-model">
                                    <span title={row.model}>{row.model}</span>
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
                                <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                                    <div className="actions-cluster">
                                        <button
                                            type="button"
                                            className="btn-action-glyph"
                                            title="Archive conversation"
                                        >
                                            <Archive size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-action-glyph"
                                            title="Open in new window"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Conversation;
