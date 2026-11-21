package com.knowledgehub.dto.response;

import com.knowledgehub.entity.Task;
import com.knowledgehub.entity.TaskStatus;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Task đã archive, hiển thị ở Settings → Archived.
 *
 * @param statusLabel nhãn hiển thị (completed / in_progress ...)
 * @param archivedLabel "Archived 10/6/2026" cho đúng định dạng UI
 */
public record ArchivedTaskResponse(
        UUID id,
        String title,
        TaskStatus status,
        String statusLabel,
        String assigneeName,
        Instant archivedAt,
        String archivedLabel) {

    private static final DateTimeFormatter DATE = DateTimeFormatter
            .ofPattern("M/d/yyyy")
            .withZone(ZoneId.systemDefault());

    public static ArchivedTaskResponse fromEntity(Task task) {
        Instant archivedAt = task.getArchivedAt();
        return new ArchivedTaskResponse(
                task.getId(),
                task.getTitle(),
                task.getStatus(),
                label(task.getStatus()),
                task.getAssignee() != null ? task.getAssignee().getName() : null,
                archivedAt,
                archivedAt != null ? "Archived " + DATE.format(archivedAt) : "Archived");
    }

    /**
     * COMPLETED -> completed, IN_PROGRESS -> in_progress (khớp class CSS của
     * UI).
     */
    static String label(TaskStatus status) {
        return status == null ? "" : status.name().toLowerCase();
    }
}
