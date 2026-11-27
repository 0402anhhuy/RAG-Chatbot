import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, User } from "lucide-react";

const MENU_MAX_HEIGHT = 288;
const MENU_GAP = 6;

const initialsOf = (name) =>
    (name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

/**
 * Ô chọn người phụ trách: pill trigger + panel có ô tìm kiếm, avatar và
 * danh sách member thật của project (BE trả về qua /projects/{id}/kanban).
 * Panel render qua portal để không bị cắt bởi vùng scroll của modal.
 */
const AssigneePicker = ({
    members = [],
    value = "",
    onChange,
    placeholder = "Assign to...",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [menuStyle, setMenuStyle] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const searchRef = useRef(null);

    const selectedMember = members.find((member) => member.email === value) || null;

    const options = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const matched = members
            .filter((member) => member.email)
            .filter(
                (member) =>
                    !needle ||
                    (member.name || "").toLowerCase().includes(needle) ||
                    member.email.toLowerCase().includes(needle),
            )
            .map((member) => ({
                key: member.userId || member.email,
                email: member.email,
                label: member.name || member.email,
                sublabel: member.email,
            }));

        return [{ key: "unassigned", email: "", label: "Unassigned", sublabel: "" }, ...matched];
    }, [members, query]);

    const placeMenu = useCallback(() => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - 12;
        const spaceAbove = rect.top - MENU_GAP - 12;
        // Mặc định mở xuống dưới; chỉ lật lên khi phía dưới quá chật
        const useAbove = spaceBelow < 150 && spaceAbove > spaceBelow;
        const maxHeight = Math.max(
            150,
            Math.min(MENU_MAX_HEIGHT, useAbove ? spaceAbove : spaceBelow),
        );
        setMenuStyle({
            left: rect.left,
            width: rect.width,
            top: useAbove ? rect.top - MENU_GAP - maxHeight : rect.bottom + MENU_GAP,
            maxHeight,
        });
    }, []);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
        triggerRef.current?.focus();
    }, []);

    const openMenu = () => {
        setQuery("");
        setActiveIndex(0);
        setIsOpen(true);
    };

    useEffect(() => {
        if (!isOpen) return undefined;

        placeMenu();
        const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);

        const handlePointerDown = (event) => {
            if (triggerRef.current?.contains(event.target)) return;
            if (menuRef.current?.contains(event.target)) return;
            setIsOpen(false);

            // Bấm ra vùng nền (backdrop) chỉ nên đóng dropdown, không đóng luôn
            // modal và xoá sạch form — chặn cú click đi kèm của chính lần bấm đó.
            if (event.target instanceof Element && event.target.closest(".ui-modal-card")) {
                return;
            }
            const swallowClick = (clickEvent) => {
                clickEvent.stopPropagation();
                cleanup();
            };
            const cleanup = () => {
                document.removeEventListener("click", swallowClick, true);
                window.clearTimeout(timer);
            };
            const timer = window.setTimeout(cleanup, 350);
            document.addEventListener("click", swallowClick, true);
        };

        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            closeMenu();
        };

        const handleScroll = (event) => {
            if (event?.target instanceof Node && menuRef.current?.contains(event.target)) return;
            placeMenu();
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("resize", placeMenu);
        window.addEventListener("scroll", handleScroll, true);

        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("resize", placeMenu);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [isOpen, placeMenu, closeMenu]);

    useEffect(() => {
        if (isOpen) setActiveIndex(0);
    }, [query, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const node = menuRef.current?.querySelector(`[data-index="${activeIndex}"]`);
        node?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, isOpen]);

    const pick = (email) => {
        onChange(email);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const handleSearchKeyDown = (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            const option = options[activeIndex];
            if (option) pick(option.email);
        }
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={`ctm-assignee-trigger ${isOpen ? "is-open" : ""}`}
                onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                {selectedMember ? (
                    <span className="ctm-avatar ctm-avatar-sm">
                        {initialsOf(selectedMember.name || selectedMember.email)}
                    </span>
                ) : (
                    <User size={15} className="ctm-assignee-glyph" />
                )}
                <span className={`ctm-assignee-value ${selectedMember ? "" : "is-placeholder"}`}>
                    {selectedMember ? selectedMember.name || selectedMember.email : placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`ctm-assignee-caret ${isOpen ? "is-open" : ""}`}
                />
            </button>

            {isOpen &&
                menuStyle &&
                createPortal(
                    <div
                        ref={menuRef}
                        className="ctm-assignee-menu"
                        style={{
                            left: menuStyle.left,
                            top: menuStyle.top,
                            width: menuStyle.width,
                            maxHeight: menuStyle.maxHeight,
                        }}
                    >
                        <div className="ctm-assignee-search">
                            <Search size={14} className="ctm-assignee-search-icon" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search members..."
                                aria-label="Search project members"
                            />
                        </div>

                        <ul className="ctm-assignee-list" role="listbox" aria-label="Assignees">
                            {options.length === 1 && query ? (
                                <li className="ctm-assignee-empty">
                                    No member matches “{query.trim()}”.
                                </li>
                            ) : null}

                            {options.map((option, index) => {
                                const isSelected =
                                    option.email === "" ? !value : option.email === value;
                                return (
                                    <li key={option.key}>
                                        <button
                                            type="button"
                                            data-index={index}
                                            role="option"
                                            aria-selected={isSelected}
                                            className={`ctm-assignee-option ${
                                                isSelected ? "is-selected" : ""
                                            } ${index === activeIndex ? "is-active" : ""}`}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            onClick={() => pick(option.email)}
                                        >
                                            {option.email ? (
                                                <span className="ctm-avatar">
                                                    {initialsOf(option.label)}
                                                </span>
                                            ) : (
                                                <span className="ctm-avatar ctm-avatar-empty">
                                                    <User size={14} />
                                                </span>
                                            )}

                                            <span className="ctm-assignee-option-text">
                                                <span className="ctm-assignee-option-name">
                                                    {option.label}
                                                </span>
                                                {option.sublabel && (
                                                    <span className="ctm-assignee-option-sub">
                                                        {option.sublabel}
                                                    </span>
                                                )}
                                            </span>

                                            {isSelected && (
                                                <Check size={16} className="ctm-assignee-check" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>,
                    document.body,
                )}
        </>
    );
};

export default AssigneePicker;
