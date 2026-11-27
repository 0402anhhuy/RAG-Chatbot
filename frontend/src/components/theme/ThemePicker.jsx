import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext.jsx";
import { THEMES, themeMeta } from "@/components/theme/themeMeta.jsx";
import "@/components/theme/ThemePicker.css";

/**
 * Dropdown chọn theme (Light / Dark / Blush) — chọn thẳng thay vì bấm xoay
 * vòng. Mở lên (direction="up") cho nút nằm footer sidebar, mở xuống mặc định.
 */
const ThemePicker = ({
    direction = "down",
    align = "left",
    showLabel = false,
    iconSize = 15,
    labelSize = "0.78rem",
    labelClassName = "",
    labelKey = "title",
    triggerClassName = "",
}) => {
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);

    const meta = themeMeta(theme);
    const Icon = meta.icon;

    useEffect(() => {
        if (!open) return undefined;
        const onOutside = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener("mousedown", onOutside);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onOutside);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const pick = (value) => {
        setTheme(value);
        setOpen(false);
        triggerRef.current?.focus();
    };

    return (
        <div className={`theme-picker ${triggerClassName ? "has-trigger" : ""}`} ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                className={`theme-picker-trigger ${open ? "open" : ""} ${triggerClassName}`}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                title={`Theme: ${meta.title}`}
            >
                <Icon size={iconSize} />
                {showLabel && (
                    <span
                        className={`theme-picker-label ${labelClassName}`}
                        style={{ fontSize: labelSize }}
                    >
                        {meta[labelKey]}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className={`theme-picker-menu ${direction} ${align}`}
                    role="menu"
                    aria-label="Color theme"
                >
                    {THEMES.map((value) => {
                        const itemMeta = themeMeta(value);
                        const ItemIcon = itemMeta.icon;
                        const active = theme === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={active}
                                className={`theme-picker-item ${active ? "active" : ""}`}
                                onClick={() => pick(value)}
                            >
                                <ItemIcon size={14} />
                                <span>{itemMeta.title}</span>
                                {active && <Check size={13} className="theme-picker-check" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ThemePicker;
