import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export const ToastItem = ({ toast, onClose }) => {
    return (
        <div className={`toast-item toast-${toast.type}`}>
            <div className="toast-icon">
                {toast.type === "success" && <CheckCircle size={18} />}
                {toast.type === "error" && <AlertCircle size={18} />}
                {toast.type === "info" && <Info size={18} />}
            </div>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => onClose(toast.id)}>
                <X size={14} />
            </button>
        </div>
    );
};
