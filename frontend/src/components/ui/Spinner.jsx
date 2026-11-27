import { Loader2 } from "lucide-react";
import "./Spinner.css";

/** Vòng xoay loading dùng chung (thay cho keyframes spin copy ở 13 file CSS). */
const Spinner = ({ size = 18, label = "Loading...", inline = false }) => {
    return (
        <span className={`ui-spinner ${inline ? "ui-spinner-inline" : ""}`} role="status">
            <Loader2 size={size} className="ui-spinner-icon" aria-hidden="true" />
            {label && <span className="ui-spinner-label">{label}</span>}
        </span>
    );
};

export default Spinner;
