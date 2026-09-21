import { useState } from "react";
import { ExternalLink, MessageSquare, Search, Trash2 } from "lucide-react";
import "./Conversation.css";

const CONVERSATIONS_DATA = [
    {
        id: 1,
        title: "Why isEdit=false users can link/unlink tools",
        project: "dmsaihub",
        model: "google-starter/gemini-1.5-flash",
        tokens: "799.3k",
        cost: "$1.5127",
        lastActivity: "Sep 15, 03:39 PM",
    },
    {
        id: 2,
        title: "DMS AI Hub reuse analysis for SyteLine",
        project: "Huy's Private Workspace",
        model: "fpt-starter-vn/DeepSeek-V4-Flash",
        tokens: "1.10M",
        cost: "$0.2345",
        lastActivity: "Sep 11, 04:45 PM",
    },
    {
        id: 3,
        title: "Locating aside component in code",
        project: "DMS_Portal",
        model: "fpt-starter-vn/GLM-4.2",
        tokens: "878.7k",
        cost: "$2.0038",
        lastActivity: "Aug 26, 04:28 PM",
    },
];

const Conversation = () => {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="tab-body-container">
            <div className="tab-header-banner">
                <h2>Your conversations</h2>
                <span>{CONVERSATIONS_DATA.length} conversations across all projects</span>
            </div>

            <div className="filter-controls-bar">
                <div className="filter-search-box">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-responsive-wrapper">
                <table className="vibe-records-table">
                    <thead>
                        <tr>
                            <th>Conversation</th>
                            <th>Project</th>
                            <th>Model</th>
                            <th>Tokens · Cost</th>
                            <th>Last Activity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {CONVERSATIONS_DATA.map((row) => (
                            <tr key={row.id}>
                                <td>
                                    <div className="cell-convo-identity">
                                        <MessageSquare size={13} className="convo-table-icon" />
                                        <strong>{row.title}</strong>
                                    </div>
                                </td>
                                <td>
                                    <code>{row.project}</code>
                                </td>
                                <td>
                                    <span className="model-chip-tag">{row.model}</span>
                                </td>
                                <td>
                                    {row.tokens} <small>({row.cost})</small>
                                </td>
                                <td>{row.lastActivity}</td>
                                <td className="actions-cell">
                                    <Trash2 size={14} className="action-row-glyph danger" />
                                    <ExternalLink size={14} className="action-row-glyph" />
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
