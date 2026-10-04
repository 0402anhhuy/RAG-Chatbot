import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import "./CustomSelector.css";

const CustomSelector = ({
    options = [],
    value,
    onChange,
    placeholder = "Chọn...",
    className = "",
    renderPrefix,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Tìm item đang được chọn
    const selectedOption = options.find((opt) => opt.value === value || opt.id === value);

    // Tự động đóng dropdown khi nhấn ra ngoài
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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

    const handleSelect = (option) => {
        const selectedVal = option.value !== undefined ? option.value : option.id;
        onChange?.(selectedVal, option);
        setIsOpen(false);
    };

    return (
        <div className={`custom-select-container ${className}`} ref={dropdownRef}>
            <button
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

            {isOpen && (
                <div className="custom-select-menu">
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
            )}
        </div>
    );
};

export default CustomSelector;
