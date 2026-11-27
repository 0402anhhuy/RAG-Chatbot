import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { adminApi } from "@/api";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import { useToast } from "@/context/ToastContext.jsx";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { getSessionUser } from "@/lib/session";

const nf = new Intl.NumberFormat("en-US");

const ROLE_OPTIONS = [
    { value: "", label: "All roles" },
    { value: "ADMIN", label: "Admin" },
    { value: "USER", label: "User" },
];

const STATUS_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "true", label: "Active" },
    { value: "false", label: "Deactivated" },
];

const PAGE_SIZE = 8;

const joinedLabel = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const AVATAR_TONES = ["t1", "t2", "t3", "t4", "t5"];
const toneOf = (seed) => {
    let h = 0;
    for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

const initialsOf = (u) => {
    const name = (u?.name || u?.email || "?").trim();
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
};

const AdminUsers = () => {
    const me = getSessionUser();
    const { showToast } = useToast();

    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(0);
    const [busyId, setBusyId] = useState(null);
    const debounceRef = useRef(null);
    const [searchInput, setSearchInput] = useState("");

    const { data: result, setData: setResult, loading, error, reload } = useAsyncData(
        () =>
            adminApi.getUsers({
                search,
                role,
                active: status,
                page,
                size: PAGE_SIZE,
            }),
        [search, role, status, page],
        { errorMessage: "Failed to load members" },
    );

    const handleSearchInput = (value) => {
        setSearchInput(value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(0);
            setSearch(value.trim());
        }, 300);
    };

    const isSelf = (u) => u.id && me.id && String(u.id) === String(me.id);

    const mutate = async (user, action) => {
        if (busyId) return;
        setBusyId(user.id);
        try {
            const updated =
                action === "role"
                    ? await adminApi.setUserRole(user.id, user.role === "ADMIN" ? "USER" : "ADMIN")
                    : await adminApi.setUserStatus(user.id, !user.active);
            setResult((prev) => ({
                ...prev,
                content: prev.content.map((u) => (u.id === updated.id ? updated : u)),
            }));
            showToast(
                action === "role"
                    ? `${updated.name || updated.email} is now ${updated.role}`
                    : `${updated.name || updated.email} is now ${updated.active ? "active" : "deactivated"}`,
                "success",
            );
        } catch (err) {
            showToast(err.message || "Update failed", "error");
        } finally {
            setBusyId(null);
        }
    };

    const content = result?.content || [];
    const totalElements = result?.totalElements ?? 0;
    const totalPages = result?.totalPages ?? 0;
    const from = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, totalElements);

    return (
        <section className="admin-card users-card">
            <header className="admin-card-head">
                <div>
                    <h2 className="admin-card-title">Members</h2>
                    <p className="admin-card-sub">
                        {loading ? "Loading…" : `${nf.format(totalElements)} accounts on the platform`}
                    </p>
                </div>
                <div className="users-toolbar">
                    <div className="users-search">
                        <Search size={14} />
                        <input
                            type="search"
                            placeholder="Search name or email…"
                            value={searchInput}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            aria-label="Search members"
                        />
                    </div>
                    <CustomSelector
                        options={ROLE_OPTIONS}
                        value={role}
                        onChange={(v) => {
                            setPage(0);
                            setRole(v);
                        }}
                        placeholder="All roles"
                        className="users-filter"
                    />
                    <CustomSelector
                        options={STATUS_OPTIONS}
                        value={status}
                        onChange={(v) => {
                            setPage(0);
                            setStatus(v);
                        }}
                        placeholder="All statuses"
                        className="users-filter"
                    />
                </div>
            </header>

            {error && (
                <div className="admin-error">
                    {error}
                    <button type="button" onClick={reload}>
                        Try again
                    </button>
                </div>
            )}

            <div className="users-table-wrap">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th className="col-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {content.map((u) => (
                            <tr key={u.id} className={busyId === u.id ? "row-busy" : ""}>
                                <td>
                                    <span className="member-cell">
                                        <span className={`avatar ${toneOf(u.email || u.name)}`}>
                                            {initialsOf(u)}
                                        </span>
                                        <span className="recent-id">
                                            <strong>{u.name || "Unnamed"}</strong>
                                            <em>{u.email}</em>
                                        </span>
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className={`role-pill ${u.role === "ADMIN" ? "role-admin" : "role-user"}`}
                                    >
                                        {u.role}
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className={`status-pill ${u.active ? "status-active" : "status-off"}`}
                                    >
                                        {u.active ? "Active" : "Deactivated"}
                                    </span>
                                </td>
                                <td className="cell-muted">{joinedLabel(u.createdAt)}</td>
                                <td className="col-actions">
                                    <div className="row-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-xs"
                                            disabled={isSelf(u) || busyId === u.id}
                                            title={
                                                isSelf(u)
                                                    ? "You can't change your own role"
                                                    : u.role === "ADMIN"
                                                      ? "Set role to User"
                                                      : "Set role to Admin"
                                            }
                                            onClick={() => mutate(u, "role")}
                                        >
                                            {u.role === "ADMIN" ? "Make User" : "Make Admin"}
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn btn-xs ${u.active ? "btn-danger-ghost" : "btn-primary"}`}
                                            disabled={isSelf(u) || busyId === u.id}
                                            title={
                                                isSelf(u)
                                                    ? "You can't deactivate your own account"
                                                    : u.active
                                                      ? "Deactivate account"
                                                      : "Reactivate account"
                                            }
                                            onClick={() => mutate(u, "status")}
                                        >
                                            {u.active ? "Deactivate" : "Activate"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && !content.length && (
                            <tr>
                                <td colSpan={5} className="users-empty">
                                    No members match these filters. Try a different search.
                                </td>
                            </tr>
                        )}
                        {loading && (
                            <tr>
                                <td colSpan={5} className="users-empty">
                                    Loading members…
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <footer className="users-footer">
                <span className="users-count">
                    Showing {from}–{to} of {nf.format(totalElements)}
                </span>
                <div className="users-pager">
                    <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        disabled={page <= 0 || loading}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                        <ChevronLeft size={13} /> Prev
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        disabled={page >= totalPages - 1 || loading}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                        Next <ChevronRight size={13} />
                    </button>
                </div>
            </footer>
        </section>
    );
};

export default AdminUsers;
