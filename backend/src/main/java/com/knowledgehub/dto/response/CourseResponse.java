package com.knowledgehub.dto.response;

import com.knowledgehub.entity.Course;
import com.knowledgehub.entity.Document;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Khóa học hiển thị ở tab Courses.
 *
 * @param docsCount số tài liệu đã đính kèm (đếm từ documents, không lưu sẵn)
 * @param progress tiến độ 0..100
 * @param status "completed" | "in_progress" theo completionThreshold
 * @param materials tài liệu của khóa; rỗng nếu chưa upload gì
 */
public record CourseResponse(
        UUID id,
        UUID workspaceId,
        String code,
        String title,
        String semester,
        String instructor,
        String description,
        int docsCount,
        int progress,
        int completedLessons,
        int totalLessons,
        String status,
        List<Material> materials,
        Instant createdAt,
        Instant updatedAt) {

    private static final DateTimeFormatter DATE = DateTimeFormatter
            .ofPattern("MMM d, yyyy")
            .withZone(ZoneId.systemDefault());

    /**
     * Một tài liệu học tập. size/uploadedAt là bản đã format sẵn cho bảng UI.
     */
    public record Material(
            UUID id,
            String name,
            String fileType,
            String size,
            long sizeBytes,
            String uploadedAt,
            String status,
            boolean downloadable) {

        public static Material fromEntity(Document document) {
            String size = document.getFileSizeFormatted();
            if (size == null || size.isBlank()) {
                size = formatSize(document.getFileSizeBytes());
            }
            return new Material(
                    document.getId(),
                    document.getFilename(),
                    document.getFileType(),
                    size,
                    document.getFileSizeBytes() != null ? document.getFileSizeBytes() : 0L,
                    document.getCreatedAt() != null ? DATE.format(document.getCreatedAt()) : "",
                    document.getStatus() != null ? document.getStatus().name().toLowerCase() : "pending",
                    document.getStoragePath() != null && !document.getStoragePath().isBlank());
        }

        private static String formatSize(Long bytes) {
            if (bytes == null || bytes <= 0) {
                return "—";
            }
            if (bytes < 1024 * 1024) {
                return String.format("%.1f KB", bytes / 1024.0);
            }
            return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        }
    }

    public static CourseResponse from(Course course, List<Document> materials) {
        int progress = course.progressPercent();
        String status = progress >= course.getCompletionThreshold() ? "completed" : "in_progress";

        return new CourseResponse(
                course.getId(),
                course.getWorkspace() != null ? course.getWorkspace().getId() : null,
                course.getCode(),
                course.getTitle(),
                course.getSemester(),
                course.getInstructor(),
                course.getDescription(),
                materials.size(),
                progress,
                course.getCompletedLessons(),
                course.getTotalLessons(),
                status,
                materials.stream().map(Material::fromEntity).toList(),
                course.getCreatedAt(),
                course.getUpdatedAt());
    }
}
