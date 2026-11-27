import {
    Bot,
    FileText,
    FolderKanban,
    TrendingDown,
    TrendingUp,
    UserPlus,
    Users,
} from "lucide-react";
import { PulseChart, RoleDonut } from "@/features/admin/adminCharts.jsx";

const nf = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

const joinedLabel = (iso) => {
    if (!iso) return "—";
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const AVATAR_TONES = ["t1", "t2", "t3", "t4", "t5"];
const toneOf = (seed) => {
    let h = 0;
    for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

const initialsOf = (user) => {
    const name = (user?.name || user?.email || "?").trim();
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
};

const TrendBadge = ({ pct }) => {
    if (pct === undefined || pct === null) return null;
    const up = pct >= 0;
    const Icon = up ? TrendingUp : TrendingDown;
    return (
        <span className={`trend-badge ${up ? "trend-up" : "trend-down"}`}>
            <Icon size={12} /> {up ? "+" : ""}
            {pct}%
        </span>
    );
};

const MetricCard = ({ icon: Icon, label, value, trend, caption, loading }) => (
    <article className={`metric-card ${loading ? "is-loading" : ""}`}>
        <div className="metric-icon-chip">
            <Icon size={15} />
        </div>
        <p className="metric-label">{label}</p>
        <div className="metric-value-row">
            {loading ? (
                <span className="skeleton-block metric-skeleton" />
            ) : (
                <>
                    <strong className="metric-value">{value}</strong>
                    <TrendBadge pct={trend} />
                </>
            )}
        </div>
        <p className="metric-caption">{caption}</p>
    </article>
);

const AdminOverview = ({ data, loading, onRetry }) => {
    if (!loading && !data) {
        return (
            <div className="admin-empty">
                <p>Couldn't load platform data.</p>
                <button type="button" className="btn btn-primary" onClick={onRetry}>
                    Retry
                </button>
            </div>
        );
    }

    const d = data || {};
    const activePct = d.totalUsers ? Math.round((d.activeUsers / d.totalUsers) * 100) : 0;

    return (
        <div className="admin-overview">
            <section className="metric-grid" aria-label="Key metrics">
                <MetricCard
                    icon={Users}
                    label="Total members"
                    value={loading ? "" : nf.format(d.totalUsers)}
                    trend={d.userTrendPct}
                    caption="Accounts on the platform"
                    loading={loading}
                />
                <MetricCard
                    icon={UserPlus}
                    label="New this period"
                    value={loading ? "" : nf.format(d.newUsers)}
                    caption={`${nf.format(d.activeUsers)} active · ${activePct}% of platform`}
                    loading={loading}
                />
                <MetricCard
                    icon={FolderKanban}
                    label="Projects"
                    value={loading ? "" : nf.format(d.totalProjects)}
                    caption="Workspaces created"
                    loading={loading}
                />
                <MetricCard
                    icon={FileText}
                    label="Documents"
                    value={loading ? "" : nf.format(d.totalDocuments)}
                    caption="Files in knowledge bases"
                    loading={loading}
                />
                <MetricCard
                    icon={Bot}
                    label="AI events"
                    value={loading ? "" : compact.format(d.aiEvents)}
                    trend={d.aiTrendPct}
                    caption={`${compact.format(d.aiTokens)} tokens all time`}
                    loading={loading}
                />
            </section>

            <section className="overview-grid">
                <article className="admin-card pulse-card">
                    <header className="admin-card-head">
                        <div>
                            <h2 className="admin-card-title">Platform pulse</h2>
                            <p className="admin-card-sub">
                                New accounts and AI events — each scaled to its own peak
                            </p>
                        </div>
                        <div className="pulse-legend">
                            <span>
                                <i className="dot dot-accent" /> New accounts
                            </span>
                            <span>
                                <i className="dot dot-violet" /> AI events
                            </span>
                        </div>
                    </header>
                    {loading ? (
                        <div className="skeleton-block pulse-skeleton" />
                    ) : (
                        <PulseChart series={d.activitySeries || []} />
                    )}
                </article>

                <div className="overview-side">
                    <article className="admin-card">
                        <header className="admin-card-head">
                            <div>
                                <h2 className="admin-card-title">Role split</h2>
                            </div>
                        </header>
                        {loading ? (
                            <div className="skeleton-block donut-skeleton" />
                        ) : (
                            <RoleDonut distribution={d.roleDistribution} />
                        )}
                    </article>

                    <article className="admin-card">
                        <header className="admin-card-head">
                            <div>
                                <h2 className="admin-card-title">Content mix</h2>
                            </div>
                        </header>
                        <dl className="mix-list">
                            {[
                                ["Chat sessions", d.totalChatSessions],
                                ["Messages", d.totalMessages],
                                ["Quiz attempts", d.totalQuizAttempts],
                                ["Tasks", d.totalTasks],
                            ].map(([label, value]) => (
                                <div className="mix-row" key={label}>
                                    <dt>{label}</dt>
                                    <dd>{loading ? "—" : nf.format(value)}</dd>
                                </div>
                            ))}
                        </dl>
                    </article>
                </div>
            </section>

            <section className="admin-card">
                <header className="admin-card-head">
                    <div>
                        <h2 className="admin-card-title">Recent members</h2>
                        <p className="admin-card-sub">Latest accounts to join the platform</p>
                    </div>
                </header>
                {loading ? (
                    <div className="skeleton-block table-skeleton" />
                ) : (
                    <ul className="recent-list">
                        {(d.recentUsers || []).map((u) => (
                            <li key={u.id} className="recent-row">
                                <span className={`avatar ${toneOf(u.email || u.name)}`}>
                                    {initialsOf(u)}
                                </span>
                                <span className="recent-id">
                                    <strong>{u.name || "Unnamed"}</strong>
                                    <em>{u.email}</em>
                                </span>
                                <span className={`role-pill ${u.role === "ADMIN" ? "role-admin" : "role-user"}`}>
                                    {u.role}
                                </span>
                                <span
                                    className={`status-pill ${u.active ? "status-active" : "status-off"}`}
                                >
                                    {u.active ? "Active" : "Deactivated"}
                                </span>
                                <span className="recent-joined">{joinedLabel(u.createdAt)}</span>
                            </li>
                        ))}
                        {!d.recentUsers?.length && (
                            <li className="recent-empty">No members have signed up yet.</li>
                        )}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default AdminOverview;
