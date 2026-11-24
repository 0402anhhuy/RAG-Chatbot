import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import "./CustomSelector.css";

const MENU_ITEM_HEIGHT = 32;
const MENU_MAX_HEIGHT = 240;
const MENU_GAP = 5;

/**
 * Dropdown chọn option dùng chung. Mặc định menu render inline (absolute);
 * bật `portal` để menu render qua portal với position: fixed — không bị
 * cắt bởi ancestor có overflow: hidden, tự lật lên khi thiếu chỗ bên dưới.
 */
const CustomSelector = ({
    options = [],
    value,
    onChange,
    placeholder = "Chọn...",
    className = "",
    renderPrefix,
    portal = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPos, setMenuPos] = useState(null);
    const [openUp, setOpenUp] = useState(false);
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    // Tìm item đang được chọn
    const selectedOption = options.find((opt) => opt.value === value || opt.id === value);

    const updateMenuPosition = useCallback(() => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const menuHeight = Math.min(
            options.length * MENU_ITEM_HEIGHT + 10,
            MENU_MAX_HEIGHT,
        );
        const spaceBelow = window.innerHeight - rect.bottom;
        const flip = spaceBelow < menuHeight + 12 && rect.top > menuHeight + 12;
        setOpenUp(flip);
        setMenuPos({
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 340)),
            top: flip ? Math.max(8, rect.top - menuHeight - MENU_GAP) : rect.bottom + MENU_GAP,
            minWidth: Math.max(rect.width, 160),
        });
    }, [options.length]);

    // Tự động đóng dropdown khi nhấn ra ngoài
    useEffect(() => {
        const handleOutsideClick = (e) => {
            const inTrigger = dropdownRef.current?.contains(e.target);
            const inMenu = menuRef.current?.contains(e.target);
            if (!inTrigger && !inMenu) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleOutsideClick);
        }
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [isOpen]);

    // Chế độ portal: tính lại vị trí khi scroll/resize để menu luôn bám trigger
    useEffect(() => {
        if (!isOpen || !portal) return undefined;
        updateMenuPosition();

        const handleReposition = (event) => {
            // Scroll bên trong chính menu (menu có overflow-y) thì giữ nguyên
            if (event?.target instanceof Node && menuRef.current?.contains(event.target)) {
                return;
            }
            updateMenuPosition();
        };

        window.addEventListener("scroll", handleReposition, true);
        window.addEventListener("resize", handleReposition);
        return () => {
            window.removeEventListener("scroll", handleReposition, true);
            window.removeEventListener("resize", handleReposition);
        };
    }, [isOpen, portal, updateMenuPosition]);

    const handleSelect = (option) => {
        const selectedVal = option.value !== undefined ? option.value : option.id;
        onChange?.(selectedVal, option);
        setIsOpen(false);
    };

    const menuContent = (
        <div
            ref={menuRef}
            className={`custom-select-menu ${portal ? "portal" : ""} ${portal && openUp ? "up" : ""}`}
            style={portal ? menuPos : undefined}
        >
            {options.map((option) => {
                const optValue = option.value !== undefined ? option.value : option.id;
                const isSelected =
                    selectedOption &&
                    (selectedOption.value === optValue || selectedOption.id === optValue);

                return (
                    <button
                        key={optValue}
                        type="button"
                        className={`custom-select-option ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelect(option)}
                    >
                        {option.color && (
                            <span className={`select-dot-indicator ${option.color}`} />
                        )}
                        {option.icon && (
                            <span className="select-option-icon">{option.icon}</span>
                        )}
                        <span className="select-option-text">{option.label}</span>
                        {isSelected && <Check size={13} className="select-check-icon" />}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className={`custom-select-container ${className}`} ref={dropdownRef}>
            <button
                ref={triggerRef}
                type="button"
                className={`custom-select-trigger ${isOpen ? "open" : ""}`}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                {/* Prefix hiển thị (chấm màu hoặc icon tùy chọn) */}
                {renderPrefix ? (
                    renderPrefix(selectedOption)
                ) : selectedOption?.color ? (
                    <span className={`select-dot-indicator ${selectedOption.color}`} />
                ) : null}

                <span className="custom-select-label">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <ChevronDown
                    size={13}
                    className={`custom-select-chevron ${isOpen ? "open" : ""}`}
                />
            </button>

            {isOpen && (portal ? createPortal(menuContent, document.body) : menuContent)}
        </div>
    );
};

export default CustomSelector;
