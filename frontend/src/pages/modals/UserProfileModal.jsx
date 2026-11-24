import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BadgeCheck,
    Check,
    Code2,
    Copy,
    Database,
    GraduationCap,
    KeyRound,
    Library,
    Mail,
    Phone,
    Server,
    ShieldCheck,
    X,
} from "lucide-react";
import "./UserProfileModal.css";

const UserProfileModal = ({
    isOpen,
    onClose,
    session,
    workspaceName,
    workspaceCount,
    docStats,
    chunkTotal,
}) => {
    const [copiedField, setCopiedField] = useState(null);
    const navigate = useNavigate();

    if (!isOpen) return null;

    const user = {
        name: session?.name || "—",
        email: session?.email || "—",
        phone: session?.phone || "—",
        role: session?.role || "USER",
        id: session?.id || "—",
    };

    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 1800);
    };

    return (
        <div className="profile-modal-scrim" onClick={onClose}>
            <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <header className="profile-modal-header">
                    <div className="header-title-wrap">
                        <div className="header-icon-box">
                            <ShieldCheck size={18} />
                        </div>
                        <div className="header-text-block">
                            <h2>User Identity & Access Controls</h2>
                            <p>Credential profile, permissions, and knowledge base usage</p>
                        </div>
                    </div>
                    <button type="button" className="close-action-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </header>

                {/* Modal Scrollable Body */}
                <div className="profile-modal-body">
                    {/* Identity Hero Card */}
                    <div className="identity-hero-card">
                        <div className="user-avatar-large">
                            {user.name !== "—" ? user.name.slice(0, 2).toUpperCase() : "—"}
                        </div>
                        <div className="identity-narrative">
                            <div className="name-status-row">
                                <h3>{user.name}</h3>
                                {session?.active !== false && (
                                    <span className="verified-pill">
                                        <BadgeCheck size={13} /> Verified
                                    </span>
                                )}
                            </div>
                            <span className="identity-email">{user.email}</span>
                        </div>
                        <div className="role-tag-box">
                            <span className="platform-role-tag">{user.role}</span>
                        </div>
                    </div>

                    {/* Account Details 2-Column Grid */}
                    <section className="profile-details-grid">
                        <div className="meta-field-tile">
                            <div className="meta-tile-label">
                                <KeyRound size={13} />
                                <span>User ID</span>
                            </div>
                            <div className="meta-tile-value-copy">
                                <code>{user.id}</code>
                                {user.id !== "—" && (
                                    <button
                                        type="button"
                                        className="copy-mini-btn"
                                        onClick={() => handleCopy(user.id, "id")}
                                        title="Copy ID"
                                    >
                                        {copiedField === "id" ? (
                                            <Check size={13} color="var(--success-bright)" />
                                        ) : (
                                            <Copy size={13} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="meta-field-tile">
                            <div className="meta-tile-label">
                                <Phone size={13} />
                                <span>Phone Number</span>
                            </div>
                            <div className="meta-tile-value">
                                <strong>{user.phone}</strong>
                            </div>
                        </div>

                        <div className="meta-field-tile">
                            <div className="meta-tile-label">
                                <Mail size={13} />
                                <span>Email</span>
                            </div>
                            <div className="meta-tile-value">
                                <strong>{user.email}</strong>
                            </div>
                        </div>

                        <div className="meta-field-tile">
                            <div className="meta-tile-label">
                                <Server size={13} />
                                <span>Workspace</span>
                            </div>
                            <div className="meta-tile-value">
                                <code>{workspaceName || "—"}</code>
                            </div>
                        </div>
                    </section>

                    {/* Assigned Hubs & Entitlements */}
                    <section className="modal-section-group">
                        <span className="section-small-title">ASSIGNED WORKSPACE HUBS</span>
                        <div className="assigned-hubs-grid">
                            <div className="hub-entitlement-card">
                                <div className="hub-card-left">
                                    <span className="hub-type-glyph dev">
                                        <Code2 size={16} />
                                    </span>
                                    <div className="hub-entitlement-meta">
                                        <strong>Developer Hub</strong>
                                        <small>Code Review, SAST, Canvas</small>
                                    </div>
                                </div>
                                <span className="entitlement-badge enabled">Active</span>
                            </div>

                            <div className="hub-entitlement-card">
                                <div className="hub-card-left">
                                    <span className="hub-type-glyph edu">
                                        <GraduationCap size={16} />
                                    </span>
                                    <div className="hub-entitlement-meta">
                                        <strong>Academy Hub</strong>
                                        <small>Tutoring, Quiz Prep, Courseware</small>
                                    </div>
                                </div>
                                <span className="entitlement-badge enabled">Active</span>
                            </div>
                        </div>
                    </section>

                    {/* Knowledge Base Usage — real numbers from backend */}
                    <section className="modal-section-group">
                        <span className="section-small-title">KNOWLEDGE BASE USAGE</span>
                        <div className="quota-metrics-container">
                            <div className="quota-card-row">
                                <div className="quota-meta-header">
                                    <div className="quota-label-unit">
                                        <Library size={14} color="var(--accent)" />
                                        <strong>Documents</strong>
                                    </div>
                                    <span className="quota-numeric-counter">
                                        {(docStats?.total ?? 0).toLocaleString()} uploaded ·{" "}
                                        {(docStats?.indexed ?? 0).toLocaleString()} indexed
                                    </span>
                                </div>
                            </div>

                            <div className="quota-card-row">
                                <div className="quota-meta-header">
                                    <div className="quota-label-unit">
                                        <Database size={14} color="var(--accent)" />
                                        <strong>Vector Chunks</strong>
                                    </div>
                                    <span className="quota-numeric-counter">
                                        {(chunkTotal ?? 0).toLocaleString()} chunks embedded
                                    </span>
                                </div>
                            </div>

                            <div className="quota-card-row">
                                <div className="quota-meta-header">
                                    <div className="quota-label-unit">
                                        <Server size={14} color="var(--success)" />
                                        <strong>Connected Workspaces</strong>
                                    </div>
                                    <span className="quota-numeric-counter">
                                        {(workspaceCount ?? 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Modal Footer */}
                <footer className="profile-modal-footer">
                    <div className="footer-status-pill">
                        <span className="status-live-dot" />
                        <span>Active Session</span>
                    </div>
                    <button
                        type="button"
                        className="btn-manage-account-action"
                        onClick={() => {
                            onClose();
                            navigate("/settings");
                        }}
                    >
                        <span>Manage Full Account</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default UserProfileModal;
