import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import AddMemberModal from "../../components/modals/member/AddMemberModal";
import "./ProjectMember.css";

const INITIAL_MEMBERS = [
    {
        id: "m-1",
        name: "Huy Tran Anh",
        email: "HuyTA12@fpt.com",
        role: "Project Manager",
    },
];

const ROLE_OPTIONS = ["Project Manager", "Team Lead", "Member"];

const ProjectMember = () => {
    const [members, setMembers] = useState(INITIAL_MEMBERS);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleRoleChange = (memberId, newRole) => {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    };

    const handleDeleteMember = (memberId) => {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
    };

    const handleAddMember = (newMember) => {
        setMembers((prev) => [...prev, { ...newMember, id: `m-${Date.now()}` }]);
    };

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

                {/* Danh sách thành viên */}
                <div className="members-list-container">
                    {members.map((member) => (
                        <div key={member.id} className="member-row-item">
                            {/* Khối thông tin bên trái: Avatar + Tên + Email */}
                            <div className="member-left-profile">
                                <div className="member-avatar-badge">
                                    {member.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="member-identity-texts">
                                    <div className="name-and-role-inline">
                                        <strong className="member-name-label">{member.name}</strong>
                                        <span className="member-inline-role">{member.role}</span>
                                    </div>
                                    <span className="member-email-label">{member.email}</span>
                                </div>
                            </div>

                            {/* Khối hành động bên phải: Select role + Nút xóa */}
                            <div className="member-right-controls">
                                <div className="member-role-select-wrap">
                                    <select
                                        className="member-role-native-select"
                                        value={member.role}
                                        onChange={(e) =>
                                            handleRoleChange(member.id, e.target.value)
                                        }
                                    >
                                        {ROLE_OPTIONS.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="role-caret-icon" />
                                </div>

                                <button
                                    type="button"
                                    className="btn-delete-member"
                                    onClick={() => handleDeleteMember(member.id)}
                                    title="Remove member"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Add Member */}
            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddMember}
            />
        </div>
    );
};

export default ProjectMember;
