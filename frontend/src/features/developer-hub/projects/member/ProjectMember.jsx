import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { projectMemberApi } from "@/api";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import AddMemberModal from "@/features/developer-hub/projects/modals/member/AddMemberModal.jsx";
import "@/features/developer-hub/projects/member/ProjectMember.css";
import { getSessionUserId } from "@/lib/session";
import { useAsyncData } from "@/hooks/useAsyncData.js";

// Vai trò trong project (ProjectMemberRole của BE). Owner không đổi được vai trò.
const ROLE_OPTIONS = [
    { value: "PROJECT_MANAGER", label: "Project Manager" },
    { value: "TEAM_LEAD", label: "Team Lead" },
    { value: "MEMBER", label: "Member" },
];

const initialsOf = (name, email) => {
    const source = (name || email || "?").trim();
    return source.slice(0, 2).toUpperCase();
};

const ProjectMember = ({ project = null, onMembersChanged }) => {
    const { showToast } = useToast();
    const projectId = project?.id || null;
    const currentUserId = getSessionUserId();

    const [pendingMemberId, setPendingMemberId] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const {
        data: members,
        setData: setMembers,
        loading,
        error,
    } = useAsyncData(() => projectMemberApi.list(projectId), [projectId], {
        initialData: [],
        enabled: Boolean(projectId),
        errorMessage: "Unable to load project members.",
    });

    const handleRoleChange = async (member, role) => {
        if (!projectId || member.role === role) return;
        const previous = members;
        setMembers((prev) =>
            prev.map((item) => (item.id === member.id ? { ...item, role } : item)),
        );
        setPendingMemberId(member.id);
        try {
            const saved = await projectMemberApi.updateRole(projectId, member.id, role);
            setMembers((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
            showToast("Role updated.", "success");
        } catch (err) {
            setMembers(previous);
            showToast(err.message || "Unable to update the role.", "error");
        } finally {
            setPendingMemberId(null);
        }
    };

    const handleDeleteMember = async (member) => {
        if (!projectId) return;
        setPendingMemberId(member.id);
        try {
            await projectMemberApi.remove(projectId, member.id);
            setMembers((prev) => prev.filter((item) => item.id !== member.id));
            onMembersChanged?.();
            showToast("Member removed.", "success");
        } catch (err) {
            showToast(err.message || "Unable to remove the member.", "error");
        } finally {
            setPendingMemberId(null);
        }
    };

    // Modal tự gọi BE để search user + thêm member, trả về bản ghi member mới
    const handleAddMember = (created) => {
        if (created) setMembers((prev) => [...prev, created]);
        onMembersChanged?.();
        showToast("Member added.", "success");
    };

    const roleOptionsFor = (member) =>
        member.owner ? [{ value: "PROJECT_MANAGER", label: "Project Manager" }] : ROLE_OPTIONS;

    if (!projectId) {
        return (
            <div className="project-members-viewport">
                <div className="members-main-card members-state-text" role="alert">
                    Open a project first to manage its members.
                </div>
            </div>
        );
    }

    return (
        <div className="project-members-viewport">
            <div className="members-main-card">
                {/* Header card */}
                <div className="members-card-header">
                    <div className="header-text-cluster">
                        <h2>Project Members</h2>
                        <span className="member-count-caption">
                            {members.length} {members.length === 1 ? "member" : "members"}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="btn-add-member-pill"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus size={15} />
                        <span>Add Member</span>
                    </button>
                </div>

                {loading && (
                    <div className="members-state-text">
                        <Loader2 size={15} className="members-spin" />
                        <span>Loading members...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="members-state-text members-state-error" role="alert">
                        <span>{error}</span>
                        <button
                            type="button"
                            className="btn-retry-members"
                            onClick={() => loadMembers()}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Danh sách thành viên */}
                {!loading && !error && (
                    <div className="members-list-container">
                        {members.length === 0 ? (
                            <div className="members-empty-text">
                                No members in this project yet.
                            </div>
                        ) : (
                            members.map((member) => {
                                const isBusy = pendingMemberId === member.id;
                                const isSelf = member.userId === currentUserId;
                                return (
                                    <div key={member.id} className="member-row-item">
                                        {/* Khối thông tin bên trái: Avatar + Tên + Email */}
                                        <div className="member-left-profile">
                                            <div className="member-avatar-badge">
                                                {initialsOf(member.name, member.email)}
                                            </div>
                                            <div className="member-identity-texts">
                                                <div className="name-and-role-inline">
                                                    <strong className="member-name-label">
                                                        {member.name || member.email}
                                                    </strong>
                                                    <span className="member-inline-role">
                                                        {member.roleLabel || member.role}
                                                    </span>
                                                </div>
                                                <span className="member-email-label">
                                                    {member.email}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Khối hành động bên phải: Select role + Nút xóa */}
                                        <div className="member-right-controls">
                                            <CustomSelector
                                                className="member-role-selector"
                                                options={roleOptionsFor(member)}
                                                value={member.role}
                                                onChange={(role) => handleRoleChange(member, role)}
                                                placeholder="Select role"
                                            />

                                            {!member.owner && (
                                                <button
                                                    type="button"
                                                    className="btn-delete-member"
                                                    onClick={() => handleDeleteMember(member)}
                                                    disabled={isBusy}
                                                    title={
                                                        isSelf
                                                            ? "Leave this project"
                                                            : "Remove member"
                                                    }
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Modal Add Member */}
            <AddMemberModal
                isOpen={isAddModalOpen}
                projectId={projectId}
                memberIds={members.map((member) => member.userId)}
                onClose={() => setIsAddModalOpen(false)}
                onAdded={handleAddMember}
            />
        </div>
    );
};

export default ProjectMember;
