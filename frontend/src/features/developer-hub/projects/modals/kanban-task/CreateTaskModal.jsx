import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal.jsx";
import TaskFormFields from "@/features/developer-hub/projects/modals/kanban-task/TaskFormFields.jsx";
import { generateTaskDescription } from "@/api/tasks.js";
import "@/features/developer-hub/projects/modals/kanban-task/CreateTaskModal.css";

/**
 * Form tạo task — dùng CHUNG bộ field với modal xem/sửa (TaskFormFields).
 *
 * Chế độ tạo: tiêu đề "Create New Task", footer Cancel + Create Task,
 * KHÔNG có Archive và Remaining Estimate.
 *
 * Description chỉ là ô xem trước: click (hoặc Enter/Space khi đang focus) mở
 * modal "Generate Task Description". Save trong modal đó chỉ ghi vào form;
 * task chỉ được lưu khi bấm Create Task.
 */
const CreateTaskModal = ({
    isOpen,
    onClose,
    onCreate,
    initialStatus = "BACKLOG",
    members = [],
    project = null,
}) => {
    const [values, setValues] = useState({
        title: "",
        description: "",
        labels: [],
        storyPoints: "",
        originalEstimate: "",
        status: initialStatus,
        priority: "MEDIUM",
        assigneeEmail: "",
        members,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTitleError, setShowTitleError] = useState(false);

    const titleRef = useRef(null);
    const labelInputRef = useRef(null);
    const assigneeRef = useRef(null);
    const descriptionTriggerRef = useRef(null);

    // Mỗi lần mở lại: reset sạch form, giữ đúng cột đang thao tác
    useEffect(() => {
        if (!isOpen) return;
        setValues({
            title: "",
            description: "",
            labels: [],
            storyPoints: "",
            originalEstimate: "",
            status: initialStatus,
            priority: "MEDIUM",
            assigneeEmail: "",
            members,
        });
        setIsSubmitting(false);
        setShowTitleError(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialStatus]);

    if (!isOpen) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;

        if (!values.title.trim()) {
            setShowTitleError(true);
            titleRef.current?.focus();
            return;
        }

        setIsSubmitting(true);
        try {
            await onCreate({
                title: values.title.trim(),
                description: values.description,
                labels: values.labels,
                storyPoints: values.storyPoints,
                originalEstimate: values.originalEstimate,
                remainingEstimate: values.originalEstimate,
                status: values.status,
                priority: values.priority,
                assigneeEmail: values.assigneeEmail || null,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Task"
            size="lg"
            className="ctm-modal"
            bodyClassName="ctm-body"
            footerClassName="ctm-modal-footer"
            footer={
                <>
                    <button type="button" className="ctm-btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="create-new-task-form"
                        className="ctm-btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Creating..." : "Create Task"}
                    </button>
                </>
            }
        >
            <form id="create-new-task-form" onSubmit={handleSubmit} className="ctm-form">
                <TaskFormFields
                    mode="create"
                    idPrefix="ctm"
                    values={values}
                    setValues={setValues}
                    titleRef={titleRef}
                    labelInputRef={labelInputRef}
                    assigneeRef={assigneeRef}
                    descriptionTriggerRef={descriptionTriggerRef}
                    showTitleError={showTitleError}
                    onTitleChange={(next) => {
                        setValues((prev) => ({ ...prev, title: next }));
                        if (next.trim()) setShowTitleError(false);
                    }}
                    generateDescription={generateTaskDescription}
                    contextProjectId={project?.id || null}
                    hasContext
                />
            </form>
        </Modal>
    );
};

export default CreateTaskModal;
