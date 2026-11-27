import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Calendar } from "lucide-react";
import Modal from "@/components/ui/Modal.jsx";
import TaskFormFields from "@/features/developer-hub/projects/modals/kanban-task/TaskFormFields.jsx";
import "@/features/developer-hub/projects/modals/kanban-task/CreateTaskModal.css";

const formatDate = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const toValues = (task, members) => ({
    title: task?.title || "",
    description: task?.description || "",
    labels: Array.isArray(task?.labels) ? task.labels : [],
    storyPoints: task?.storyPoints || "",
    originalEstimate: task?.originalEstimate || "",
    remainingEstimate: task?.remainingEstimate || "",
    status: task?.status || "BACKLOG",
    priority: task?.priority || "MEDIUM",
    assigneeEmail: task?.assigneeEmail || "",
    members,
});

const DetailTaskModal = ({
    isOpen,
    task,
    members = [],
    onClose,
    onSave,
    onArchive,
}) => {
    const [values, setValues] = useState(() => toValues(task, members));
    const [isSaving, setIsSaving] = useState(false);
    const titleRef = useRef(null);
    const labelInputRef = useRef(null);
    const assigneeRef = useRef(null);
    const descriptionTriggerRef = useRef(null);

    useEffect(() => {
        if (!task) return;
        setValues(toValues(task, members));
        setIsSaving(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task]);

    // Chưa có API generate → báo lỗi rõ ràng, không bịa nội dung.
    const generateDescription = async () => {
        throw new Error(
            "Generating descriptions is not available yet: the backend has no generate endpoint.",
        );
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            await onSave({
                id: task.id,
                title: values.title,
                description: values.description,
                labels: values.labels,
                storyPoints: values.storyPoints,
                originalEstimate: values.originalEstimate,
                remainingEstimate: values.remainingEstimate,
                status: values.status,
                priority: values.priority,
                assigneeEmail: values.assigneeEmail || null,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const taskCode = useMemo(
        () => (task ? `#${String(task.id).slice(-8)}` : ""),
        [task],
    );

    if (!isOpen || !task) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            className="ctm-modal"
            bodyClassName="ctm-body"
            headerContent={
                <div className="modal-title-with-tag">
                    <h3>Task Details</h3>
                    <span className="task-id-badge">{taskCode}</span>
                </div>
            }
            footerClassName="ui-modal-footer-split ctm-modal-footer"
            footer={
                <>
                    <button
                        type="button"
                        className="btn-action-archive-left"
                        onClick={() => onArchive(task.id)}
                    >
                        <Archive size={14} />
                        <span>Archive</span>
                    </button>

                    <div className="footer-right-buttons-cluster">
                        <button
                            type="button"
                            className="ctm-btn-ghost"
                            onClick={onClose}
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            form="edit-task-form"
                            className="ctm-btn-primary"
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </>
            }
        >
            <form
                id="edit-task-form"
                onSubmit={handleSave}
                className="ctm-form"
            >
                <TaskFormFields
                    mode="edit"
                    idPrefix="dtm"
                    values={values}
                    setValues={setValues}
                    titleRef={titleRef}
                    labelInputRef={labelInputRef}
                    assigneeRef={assigneeRef}
                    descriptionTriggerRef={descriptionTriggerRef}
                    generateDescription={generateDescription}
                    contextProjectId={task.projectId || null}
                    hasContext
                />

                <div className="task-created-date-row">
                    <Calendar size={14} />
                    <span>Created: {formatDate(task.createdAt)}</span>
                </div>
            </form>
        </Modal>
    );
};

export default DetailTaskModal;
