import { useState, useEffect, useMemo } from "react";
import { X, Search, Loader2, UserPlus } from "lucide-react";
import { projectMemberApi } from "../../../../../../../api/projectMembers";
import CustomSelector from "../../../../../../../components/common/selector/CustomSelector";
import "./AddMemberModal.css";

const ROLE_OPTIONS = [
    { value: "PROJECT_MANAGER", label: "Project Manager" },
    { value: "TEAM_LEAD", label: "Team Lead" },
    { value: "MEMBER", label: "Member" },
];

const initialsOf = (name, email) => (name || email || "?").trim().slice(0, 2).toUpperCase();

const AddMemberModal = ({ isOpen, projectId, memberIds = [], onClose, onAdded }) => {
    const [searchText, setSearchText] = useState("");
    const [candidates, setCandidates] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState("MEMBER");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [submitError, setSubmitError] = useState("");

    const existingIds = useMemo(() => new Set(memberIds.filter(Boolean)), [memberIds]);

    // Reset state mỗi lần mở modal
    useEffect(() => {
        if (!isOpen) return;
        setSearchText("");
        setCandidates([]);
        setSelectedUser(null);
        setSelectedRole("MEMBER");
        setIsSubmitting(false);
        setSearchError("");
        setSubmitError("");
    }, [isOpen]);

    // Tìm user trên BE (debounce 300ms), loại bỏ những người đã là member
    useEffect(() => {
        if (!isOpen || !projectId) return undefined;
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                setSearchError("");
                const data = await projectMemberApi.searchCandidates(projectId, searchText.trim());
                if (!cancelled) {
                    setCandidates((data || []).filter((user) => !existingIds.has(user.id)));
                }
            } catch (err) {
                if (!cancelled) {
                    setCandidates([]);
                    setSearchError(err.message || "Unable to search users.");
                }
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [isOpen, projectId, searchText, existingIds]);

    if (!isOpen) return null;

    const handleAdd = async () => {
        if (!projectId || !selectedUser || isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError("");
        try {
            const created = await projectMemberApi.add(projectId, {
                userId: selectedUser.id,
                role: selectedRole,
            });
            onAdded?.(created);
            onClose();
        } catch (err) {
            setSubmitError(err.message || "Unable to add this member.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="add-member-modal-overlay" onClick={onClose}>
            <div className="add-member-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header modal */}
                <div className="add-member-modal-header">
                    <div className="add-member-title-col">
                        <h3>Add Member</h3>
                        <p>Search for a user to add to this project.</p>
                    </div>
                    <button type="button" className="btn-close-modal" onClick={onClose}>
                        <X size={17} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="add-member-form">
                    {/* User search + kết quả */}
                    <div className="modal-input-group">
                        <label className="input-group-label">User email</label>
                        <div className="search-email-pill-box">
                            <Search size={15} className="search-glyph-icon" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchText}
                                onChange={(e) => {
                                    setSearchText(e.target.value);
                                    setSelectedUser(null);
                                }}
                                autoFocus
                            />
                            {isSearching && (
                                <Loader2 size={14} className="search-glyph-icon members-spin" />
                            )}
                        </div>

                        <div className="member-candidate-list">
                            {searchError && (
                                <p className="add-member-error-text" role="alert">
                                    {searchError}
                                </p>
                            )}

                            {!searchError && !isSearching && candidates.length === 0 && (
                                <p className="add-member-hint-text">
                                    {searchText.trim()
                                        ? "No matching user found."
                                        : "Type a name or email to search."}
                                </p>
                            )}

                            {candidates.map((user) => {
                                const isSelected = selectedUser?.id === user.id;
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className={`member-candidate-row ${isSelected ? "selected" : ""}`}
                                        onClick={() => setSelectedUser(isSelected ? null : user)}
                                    >
                                        <span className="member-candidate-avatar">
                                            {initialsOf(user.name, user.email)}
                                        </span>
                                        <span className="member-candidate-texts">
                                            <strong>{user.name || user.email}</strong>
                                            <span>{user.email}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Role selector dùng CustomSelector chung */}
                    <div className="modal-input-group">
                        <label className="input-group-label">Role</label>
                        <CustomSelector
                            className="add-member-role-selector"
                            options={ROLE_OPTIONS}
                            value={selectedRole}
                            onChange={(value) => setSelectedRole(value)}
                            placeholder="Select role"
                        />
                    </div>

                    {submitError && (
                        <p className="add-member-error-text" role="alert">
                            {submitError}
                        </p>
                    )}

                    <div className="add-member-footer-row">
                        <button type="button" className="btn-footer-close-pill" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-add-member-pill"
                            disabled={!selectedUser || isSubmitting}
                            onClick={handleAdd}
                        >
                            {isSubmitting ? (
                                <Loader2 size={14} className="members-spin" />
                            ) : (
                                <UserPlus size={14} />
                            )}
                            <span>{isSubmitting ? "Adding..." : "Add Member"}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;
