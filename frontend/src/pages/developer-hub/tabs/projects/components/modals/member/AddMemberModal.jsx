import { useState, useRef, useEffect } from "react";
import { X, Search, ChevronDown, Check } from "lucide-react";
import "./AddMemberModal.css";

const ROLE_OPTIONS = ["Project Manager", "Team Lead", "Member"];

const AddMemberModal = ({ isOpen, onClose, onAdd }) => {
    const [searchEmail, setSearchEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState("Member");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleSelectRole = (role) => {
        setSelectedRole(role);
        setIsDropdownOpen(false);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!searchEmail.trim()) return;

        // Giả lập lấy tên từ tiền tố email
        const generatedName =
            searchEmail.split("@")[0].charAt(0).toUpperCase() + searchEmail.split("@")[0].slice(1);

        onAdd({
            name: generatedName,
            email: searchEmail.trim(),
            role: selectedRole,
        });

        setSearchEmail("");
        setSelectedRole("Member");
        onClose();
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
                <form onSubmit={handleFormSubmit} className="add-member-form">
                    {/* User email */}
                    <div className="modal-input-group">
                        <label className="input-group-label">User email</label>
                        <div className="search-email-pill-box">
                            <Search size={15} className="search-glyph-icon" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Role dropdown custom */}
                    <div className="modal-input-group" ref={dropdownRef}>
                        <label className="input-group-label">Role</label>
                        <div
                            className="role-pill-selector-box"
                            onClick={() => setIsDropdownOpen((prev) => !prev)}
                        >
                            <span>{selectedRole}</span>
                            <ChevronDown size={15} className="selector-caret" />
                        </div>

                        {/* Dropdown Menu với dấu check */}
                        {isDropdownOpen && (
                            <div className="custom-role-dropdown-menu">
                                {ROLE_OPTIONS.map((role) => (
                                    <div
                                        key={role}
                                        className={`dropdown-role-option-row ${
                                            selectedRole === role ? "active" : ""
                                        }`}
                                        onClick={() => handleSelectRole(role)}
                                    >
                                        <span>{role}</span>
                                        {selectedRole === role && (
                                            <Check size={14} className="check-mark-glyph" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nút Submit ngầm hoặc nhấn Enter */}
                    <button type="submit" style={{ display: "none" }}>
                        Submit
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddMemberModal;
