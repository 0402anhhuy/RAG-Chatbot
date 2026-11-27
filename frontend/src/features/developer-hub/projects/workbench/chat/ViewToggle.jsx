import { Map as MapIcon, MessagesSquare } from "lucide-react";

const OPTIONS = [
    { id: "stream", label: "Stream", Icon: MessagesSquare },
    { id: "graph", label: "Map", Icon: MapIcon },
];

/** Segmented button chuyển Stream ⇄ Map (radial), đặt ở góc phải header chat. */
const ViewToggle = ({ view, onChange }) => (
    <div className="agent-view-toggle" role="tablist" aria-label="Chat view">
        {OPTIONS.map(({ id, label, Icon }) => (
            <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                className={view === id ? "active" : ""}
                onClick={() => onChange(id)}
            >
                <Icon size={12} />
                <span>{label}</span>
            </button>
        ))}
    </div>
);

export default ViewToggle;
