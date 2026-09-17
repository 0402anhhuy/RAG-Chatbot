import { useState } from "react";
import {
    BadgeCheck,
    Calendar,
    Check,
    Code2,
    Copy,
    Database,
    ExternalLink,
    GraduationCap,
    KeyRound,
    Mail,
    Phone,
    Server,
    Shield,
    ShieldCheck,
    User,
    X,
    Zap,
} from "lucide-react";
import "./UserProfileModal.css";

const UserProfileModal = ({ isOpen, onClose, session }) => {
    const [copiedField, setCopiedField] = useState(null);

    if (!isOpen) return null;

    const user = {
        name: session?.name || "Huy Tran",
        email: session?.email || "huy@prismstudio.dev",
        phone: session?.phone || "+84 (0) 90 123 4567",
        role: session?.role || "USER",
        id: session?.id || "usr_94a28f7c10b",
        tenant: "prism-prod-default",
        joinedDate: "September 2026",
        region: "ap-southeast-1 (HCMC)",
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
                            <p>Credential profile, permissions, and service resource quota</p>
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
                            {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="identity-narrative">
                            <div className="name-status-row">
                                <h3>{user.name}</h3>
                                <span className="verified-pill">
                                    <BadgeCheck size={13} /> Verified
                                </span>
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
                                <button
                                    type="button"
                                    className="copy-mini-btn"
                                    onClick={() => handleCopy(user.id, "id")}
                                    title="Copy ID"
                                >
                                    {copiedField === "id" ? (
                                        <Check size={13} color="#10b981" />
                                    ) : (
                                        <Copy size={13} />
                                    )}
                                </button>
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
                                <Server size={13} />
                                <span>Assigned Tenant</span>
                            </div>
                            <div className="meta-tile-value">
                                <code>{user.tenant}</code>
                            </div>
                        </div>

                        <div className="meta-field-tile">
                            <div className="meta-tile-label">
                                <Calendar size={13} />
                                <span>Member Since</span>
                            </div>
                            <div className="meta-tile-value">
                                <strong>{user.joinedDate}</strong>
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

                    {/* AI & Resource Quota Tracking */}
                    <section className="modal-section-group">
                        <span className="section-small-title">RESOURCE USAGE & QUOTA</span>
                        <div className="quota-metrics-container">
                            <div className="quota-card-row">
                                <div className="quota-meta-header">
                                    <div className="quota-label-unit">
                                        <Zap size={14} color="#f59e0b" />
                                        <strong>Daily AI Audit Invocations</strong>
                                    </div>
                                    <span className="quota-numeric-counter">18 / 100 used</span>
                                </div>
                                <div className="quota-bar-track">
                                    <div
                                        className="quota-bar-fill amber"
                                        style={{ width: "18%" }}
                                    />
                                </div>
                            </div>

                            <div className="quota-card-row">
                                <div className="quota-meta-header">
                                    <div className="quota-label-unit">
                                        <Database size={14} color="#0284c7" />
                                        <strong>Vector Embeddings Storage</strong>
                                    </div>
                                    <span className="quota-numeric-counter">12.4 MB / 50 MB</span>
                                </div>
                                <div className="quota-bar-track">
                                    <div
                                        className="quota-bar-fill blue"
                                        style={{ width: "24.8%" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Modal Footer */}    
                <footer className="profile-modal-footer">
                    <div className="footer-status-pill">
                        <span className="status-live-dot" />
                        <span>Active Session · {user.region}</span>
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
