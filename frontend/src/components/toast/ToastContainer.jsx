import { ToastItem } from "@/components/toast/ToastItem.jsx";
import "@/components/toast/Toast.css";

export const ToastContainer = ({ toasts, onClose }) => {
    if (!toasts.length) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
};
