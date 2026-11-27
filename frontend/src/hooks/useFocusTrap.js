import { useEffect, useRef } from "react";

const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

const cardOf = (element) => element?.closest?.(".ui-modal-card, .dm-card, [role='dialog']") || null;

/**
 * Giữ focus trong một vùng (modal đang mở trên cùng).
 *
 * - Tab / Shift+Tab xoay vòng trong container.
 * - Esc gọi onEscape (nếu có) thay vì để sự kiện nổi lên đóng modal cha.
 * - Chỉ gắn cho lớp trên cùng: modal Description tự truyền enabled=false khi
 *   dropdown Assignee đang mở (lớp trên cùng lúc đó là dropdown).
 * - Khi có modal khác mở ĐÈ LÊN (vd modal Description trên form task), trap của
 *   modal dưới không chiếm focus và không kéo focus về lại → chỉ lớp trên cùng
 *   nhận phím.
 */
export const useFocusTrap = ({
    containerRef,
    active = true,
    onEscape,
    initialFocusRef,
}) => {
    const onEscapeRef = useRef(onEscape);
    onEscapeRef.current = onEscape;
    // Card của chính layer này: dùng để so lớp trên cùng.
    const ownCardRef = useRef(null);
    // Lớp này đã "nhường" focus cho lớp trên chưa → không được đòi lại khi nó đóng.
    const yieldedRef = useRef(false);

    useEffect(() => {
        if (!active) return undefined;
        const container = containerRef.current;
        if (!container) return undefined;

        ownCardRef.current = cardOf(container) || container;
        yieldedRef.current = false;

        // Lớp trên cùng = .ui-modal-card / [role=dialog] cuối cùng đang hiển thị.
        const isTopLayer = () => {
            const cards = document.querySelectorAll(
                ".ui-modal-overlay .ui-modal-card, .dm-overlay .dm-card",
            );
            return cards.length === 0 || cards[cards.length - 1] === ownCardRef.current;
        };

        const previous = document.activeElement;
        const focusables = () =>
            [...container.querySelectorAll(FOCUSABLE)].filter(
                (el) =>
                    el.offsetParent !== null || el === document.activeElement,
            );

        // Focus phần tử đầu tiên (hoặc ô nhập được chỉ định).
        const target = initialFocusRef?.current || focusables()[0] || container;
        window.requestAnimationFrame(() => {
            if (!isTopLayer()) return;
            target?.focus?.({ preventScroll: true });
        });

        const onKeyDown = (event) => {
            if (!isTopLayer()) {
                yieldedRef.current = true;
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                onEscapeRef.current?.(event);
                return;
            }
            if (event.key !== "Tab") return;

            const items = focusables();
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];

            // Focus đang ở ngoài (rơi ra body): kéo lại lớp này.
            if (!container.contains(document.activeElement)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
                return;
            }
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        // capture: chạy trước handler Esc của Modal dùng chung
        document.addEventListener("keydown", onKeyDown, true);
        return () => {
            document.removeEventListener("keydown", onKeyDown, true);
            // Trả focus về nơi đã mở lớp này — trừ khi lớp trên đang mở (không giật
            // focus khỏi modal con) và trừ khi chính nơi đó đã bị gỡ khỏi DOM.
            const stillOnPage = previous instanceof HTMLElement && document.contains(previous);
            if (stillOnPage && !yieldedRef.current && isTopLayer()) {
                window.requestAnimationFrame(() =>
                    previous.focus?.({ preventScroll: true }),
                );
            }
        };
    }, [active, containerRef, initialFocusRef]);
};

export default useFocusTrap;
