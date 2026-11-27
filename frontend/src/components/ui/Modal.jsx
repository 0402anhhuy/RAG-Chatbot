import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./Modal.css";

/**
 * Modal dùng chung cho toàn app: overlay + panel + header (title/subtitle) +
 * nút đóng + footer tuỳ chọn. Thay cho 6 bản modal tự dựng overlay riêng.
 *
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {string}   title
 * @param {string}   subtitle
 * @param {"sm"|"md"|"lg"|"xl"} size
 * @param {ReactNode} footer
 * @param {boolean}  closeOnBackdrop
 * @param {string}   bodyClassName  class thêm cho phần thân (vd: "ui-modal-body-flush")
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    headerContent = null,
    size = "md",
    footer = null,
    footerClassName = "",
    closeOnBackdrop = true,
    className = "",
    bodyClassName = "",
    children,
}) => {
    useEffect(() => {
        if (!isOpen) return undefined;

        // Esc chỉ đóng lớp trên cùng: modal phía trên tự mount sau nên listener của nó
        // chạy sau và gọi stopImmediatePropagation → modal dưới không nhận Esc.
        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            if (event.defaultPrevented) return;
            event.stopImmediatePropagation();
            onClose?.();
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="ui-modal-overlay"
            onClick={closeOnBackdrop ? onClose : undefined}
            role="presentation"
        >
            <div
                className={`ui-modal-card ui-modal-${size} ${className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
            >
                {(headerContent || title || subtitle) && (
                    <header className="ui-modal-header">
                        {headerContent || (
                            <div className="ui-modal-heading">
                                {title && <h3>{title}</h3>}
                                {subtitle && <p>{subtitle}</p>}
                            </div>
                        )}
                        <button
                            type="button"
                            className="ui-modal-close"
                            onClick={onClose}
                            aria-label="Close dialog"
                            data-tooltip="Close"
                            data-shortcut="Esc"
                        >
                            <X size={17} />
                        </button>
                    </header>
                )}

                <div className={`ui-modal-body ${bodyClassName}`.trim()}>{children}</div>

                {footer && (
                    <footer className={`ui-modal-footer ${footerClassName}`.trim()}>
                        {footer}
                    </footer>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default Modal;
