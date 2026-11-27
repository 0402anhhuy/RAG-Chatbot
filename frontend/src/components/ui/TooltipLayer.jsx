import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@/components/ui/Tooltip.css";

const SHOW_DELAY = 380;
const GAP = 10;
const EDGE = 8;

const isApple =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");

/**
 * Cờ tạm ẩn toàn bộ tooltip trong app.
 * Khi cần bật lại: đổi thành false (hoặc build với VITE_TOOLTIPS=enabled).
 * Hard-disable để không còn tooltip native (title) lẫn tooltip tuỳ biến.
 */
const TOOLTIPS_DISABLED = import.meta.env.VITE_TOOLTIPS !== "enabled";

/**
 * Chuẩn hoá chuỗi shortcut khai báo trong data-shortcut.
 * "Mod+B" -> "⌘B" trên macOS, "Ctrl+B" trên Windows/Linux.
 */
const formatShortcut = (raw) =>
    raw
        .split("+")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const key = part.toLowerCase();
            if (key === "mod") return isApple ? "⌘" : "Ctrl";
            if (key === "ctrl" || key === "control") return isApple ? "⌃" : "Ctrl";
            if (key === "alt" || key === "option") return isApple ? "⌥" : "Alt";
            if (key === "shift") return isApple ? "⇧" : "Shift";
            if (key === "enter" || key === "return") return "↵";
            if (key === "esc" || key === "escape") return "Esc";
            if (key === "backspace") return "⌫";
            if (part.length === 1) return part.toUpperCase();
            return part;
        })
        .join(isApple ? "" : "+");

/**
 * Tooltip dùng chung cho toàn app.
 *
 * Cách dùng (không cần import gì thêm):
 *   <button data-tooltip="Save" data-shortcut="Mod+S">…</button>
 *
 * Element nào còn dùng `title` cũng tự động được nâng cấp: tooltip native bị
 * gỡ khi hover và trả lại khi rời chuột, nên toàn bộ tooltip trong app có cùng
 * một giao diện.
 */
const TooltipLayer = () => {
    const [tip, setTip] = useState(null);
    const [coords, setCoords] = useState(null);
    const anchorRef = useRef(null);
    const tipRef = useRef(null);
    const showTimer = useRef(0);

    // Toàn bộ listener được gắn một lần, không phụ thuộc state
    useEffect(() => {
        // Tooltip đang bị tắt: chỉ cần dọn title native, không gắn bất kỳ listener nào.
        if (TOOLTIPS_DISABLED) {
            const stripTitles = (root = document) => {
                root.querySelectorAll?.("[title]").forEach((element) => {
                    element.setAttribute("data-vf-title", element.getAttribute("title"));
                    element.removeAttribute("title");
                });
            };

            stripTitles();

            // Nội dung render sau (modal, danh sách tải xong…) cũng bị gỡ title.
            const observer = new MutationObserver(() => stripTitles());
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["title"],
            });

            return () => {
                observer.disconnect();
                // Trả lại title gốc khi TooltipLayer unmount (tránh mất dữ liệu).
                document.querySelectorAll("[data-vf-title]").forEach((element) => {
                    element.setAttribute("title", element.getAttribute("data-vf-title"));
                    element.removeAttribute("data-vf-title");
                });
            };
        }

        const restoreTitle = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;
            const original = anchor.getAttribute("data-vf-title");
            if (original === null) return;
            anchor.setAttribute("title", original);
            anchor.removeAttribute("data-vf-title");
        };

        const hide = () => {
            window.clearTimeout(showTimer.current);
            restoreTitle();
            anchorRef.current = null;
            setTip(null);
            setCoords(null);
        };

        const show = (anchor) => {
            if (anchor === anchorRef.current) return;
            const label =
                anchor.getAttribute("data-tooltip") ?? anchor.getAttribute("title");
            if (!label || !label.trim()) return;

            if (anchorRef.current) restoreTitle();

            // Tắt tooltip native để không hiện 2 lớp
            if (anchor.hasAttribute("title")) {
                anchor.setAttribute("data-vf-title", anchor.getAttribute("title"));
                anchor.removeAttribute("title");
            }

            anchorRef.current = anchor;
            setCoords(null);
            setTip({
                label: label.trim(),
                shortcut: (anchor.getAttribute("data-shortcut") || "").trim(),
                rect: anchor.getBoundingClientRect(),
            });
        };

        const findAnchor = (target) => {
            if (!(target instanceof Element)) return null;
            const anchor = target.closest("[data-tooltip], [title]");
            if (!anchor || anchor.closest(".vf-tooltip")) return null;
            return anchor;
        };

        const scheduleShow = (anchor, delay = SHOW_DELAY) => {
            window.clearTimeout(showTimer.current);
            if (anchorRef.current === anchor) return;
            showTimer.current = window.setTimeout(() => show(anchor), delay);
        };

        const onPointerOver = (event) => {
            if (event.pointerType === "touch") return;
            const anchor = findAnchor(event.target);
            if (!anchor) return;
            if (event.relatedTarget && anchor.contains(event.relatedTarget)) return;
            scheduleShow(anchor);
        };

        const onPointerOut = (event) => {
            const anchor = anchorRef.current;
            if (!anchor) return;
            if (event.relatedTarget && anchor.contains(event.relatedTarget)) return;
            if (event.target instanceof Node && anchor.contains(event.target)) hide();
        };

        const onFocusIn = (event) => {
            const anchor = findAnchor(event.target);
            if (anchor) scheduleShow(anchor, 0);
        };

        const onFocusOut = () => hide();
        const onDismiss = () => hide();

        document.addEventListener("pointerover", onPointerOver);
        document.addEventListener("pointerout", onPointerOut);
        document.addEventListener("focusin", onFocusIn);
        document.addEventListener("focusout", onFocusOut);
        document.addEventListener("pointerdown", onDismiss, true);
        window.addEventListener("scroll", onDismiss, true);
        window.addEventListener("resize", onDismiss);

        return () => {
            window.clearTimeout(showTimer.current);
            document.removeEventListener("pointerover", onPointerOver);
            document.removeEventListener("pointerout", onPointerOut);
            document.removeEventListener("focusin", onFocusIn);
            document.removeEventListener("focusout", onFocusOut);
            document.removeEventListener("pointerdown", onDismiss, true);
            window.removeEventListener("scroll", onDismiss, true);
            window.removeEventListener("resize", onDismiss);
            restoreTitle();
        };
    }, []);

    // Đặt tooltip phía trên, thiếu chỗ thì lật xuống; luôn kẹp trong viewport
    useLayoutEffect(() => {
        if (!tip || !tipRef.current) return;
        const { offsetWidth: width, offsetHeight: height } = tipRef.current;
        const { rect } = tip;
        const top =
            rect.top - GAP - height >= EDGE ? rect.top - GAP - height : rect.bottom + GAP;
        const centered = rect.left + rect.width / 2 - width / 2;
        const left = Math.max(EDGE, Math.min(centered, window.innerWidth - width - EDGE));
        setCoords({ left, top });
    }, [tip]);

    if (TOOLTIPS_DISABLED || !tip) return null;

    return createPortal(
        <div
            ref={tipRef}
            className="vf-tooltip"
            role="tooltip"
            style={{
                left: coords?.left ?? -9999,
                top: coords?.top ?? -9999,
                visibility: coords ? "visible" : "hidden",
            }}
        >
            <span className="vf-tooltip-label">{tip.label}</span>
            {tip.shortcut && (
                <kbd className="vf-tooltip-key">{formatShortcut(tip.shortcut)}</kbd>
            )}
        </div>,
        document.body,
    );
};

export default TooltipLayer;
