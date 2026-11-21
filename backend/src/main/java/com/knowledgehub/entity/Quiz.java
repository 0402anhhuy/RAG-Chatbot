package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Một đề kiểm tra của tab Quizzes.
 *
 * <p>
 * {@code status} không lưu sẵn mà suy ra ở service từ các {@link QuizAttempt}:
 * chưa làm lần nào = NEW, có bài đang dở = IN_PROGRESS, mọi lần đã nộp =
 * COMPLETED. Như vậy không bao giờ lệch với dữ liệu bài làm.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "quizzes",
        indexes = @Index(name = "idx_quiz_workspace", columnList = "workspace_id"))
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    /**
     * Mã môn của đề, vd CS204 (khớp Course.code để FE hiện tag).
     */
    @Column(name = "course_code", length = 50)
    private String courseCode;

    @Column(length = 200)
    private String courseTitle;

    @Column(nullable = false, length = 255)
    private String title;

    /**
     * EASY | MEDIUM | HARD — lưu chữ thường để khớp class CSS của UI.
     */
    @Column(nullable = false, length = 20)
    private String difficulty = "medium";

    /**
     * Số câu của đề; đồng bộ với số câu đã nhập.
     */
    @Column(name = "total_questions", nullable = false)
    private int totalQuestions;

    /**
     * Thời lượng gợi ý (phút). 0 = không giới hạn.
     */
    @Column(name = "time_minutes", nullable = false)
    private int timeMinutes;

    @Column(nullable = false)
    private boolean archived;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (difficulty == null || difficulty.isBlank()) {
            difficulty = "medium";
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
