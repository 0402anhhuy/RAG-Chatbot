package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Một lượt làm bài. Có thể còn mở (submittedAt = null) để giữ trạng thái "In
 * Progress", nộp xong thì ghi điểm.
 *
 * <p>
 * Điểm lưu cả số câu đúng và tổng số câu tại lúc nộp, để đề bị sửa sau đó không
 * làm thay đổi điểm đã có; {@link #scorePercent()} vẫn tính lại được từ hai số
 * này.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "quiz_attempts",
        indexes = @Index(name = "idx_quiz_attempt_quiz", columnList = "quiz_id"))
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "correct_count", nullable = false)
    private int correctCount;

    @Column(name = "question_count", nullable = false)
    private int questionCount;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @PrePersist
    void onCreate() {
        if (startedAt == null) {
            startedAt = Instant.now();
        }
    }

    public boolean isSubmitted() {
        return submittedAt != null;
    }

    /**
     * Điểm 0..100 tính từ số câu đúng trên tổng số câu của lượt làm.
     */
    public int scorePercent() {
        if (questionCount <= 0) {
            return 0;
        }
        int percent = (int) Math.round(correctCount * 100.0 / questionCount);
        return Math.max(0, Math.min(percent, 100));
    }
}
