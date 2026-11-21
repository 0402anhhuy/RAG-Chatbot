package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Một khóa học trong Academy Hub (tab Courses).
 *
 * <p>
 * Khóa học thuộc một workspace và được nhận diện bằng {@code code} (vd CS204).
 * Tài liệu học tập không lưu ở đây: chúng là các {@link Document} của cùng
 * workspace có {@code courseCode} trùng với {@code code} này, nên đính kèm file
 * sẵn có là đủ, không cần chép file lần hai.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "courses",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_course_workspace_code",
                columnNames = {"workspace_id", "code"}),
        indexes = @Index(name = "idx_course_workspace", columnList = "workspace_id"))
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    /**
     * Mã môn học, vd CS204. Cũng là courseCode của tài liệu đính kèm.
     */
    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String title;

    /**
     * Học kỳ, vd "Fall 2026".
     */
    @Column(length = 50)
    private String semester;

    @Column(length = 150)
    private String instructor;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "total_lessons", nullable = false)
    private int totalLessons;

    @Column(name = "completed_lessons", nullable = false)
    private int completedLessons;

    /**
     * Ngưỡng coi là "Almost Done" ở UI. Lưu theo khóa học để mỗi môn có thể
     * khác nhau thay vì hardcode 80% trong component.
     */
    @Column(name = "completion_threshold", nullable = false)
    private int completionThreshold = 80;

    @Column(nullable = false)
    private boolean archived;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Tiến độ 0..100, tính từ số bài đã xong trên tổng số bài.
     */
    public int progressPercent() {
        if (totalLessons <= 0) {
            return 0;
        }
        int percent = (int) Math.round(completedLessons * 100.0 / totalLessons);
        return Math.max(0, Math.min(percent, 100));
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (completedLessons > totalLessons) {
            completedLessons = totalLessons;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        if (completedLessons > totalLessons) {
            completedLessons = totalLessons;
        }
        updatedAt = Instant.now();
    }
}
