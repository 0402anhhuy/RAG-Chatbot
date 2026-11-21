package com.knowledgehub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Toàn bộ tuỳ chọn của tab Settings trong Academy Hub: hồ sơ sinh viên, cách AI
 * Tutor trả lời, mục tiêu học tập và nhắc nhở.
 *
 * <p>
 * Mỗi user có tối đa một bản ghi (unique user_id). Bản ghi chỉ được tạo ở lần
 * lưu đầu tiên, nên lần đọc đầu tiên trả về giá trị mặc định thay vì bịa dữ
 * liệu trong DB.
 * </p>
 *
 * <p>
 * Các trường hồ sơ chỉ cần độ dài lớn để nhận dữ liệu người dùng nhập, không
 * lưu trạng thái "đang tải" hay "đã lưu" — những thứ đó thuộc về UI.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "academy_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_academy_settings_user", columnNames = "user_id"),
        indexes = @Index(name = "idx_academy_settings_user", columnList = "user_id"))
public class AcademySetting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    // ------------------------------------------------------------- profile
    @Column(name = "full_name", length = 120)
    private String fullName;

    @Column(length = 255)
    private String email;

    @Column(length = 255)
    private String university;

    @Column(name = "student_id", length = 40)
    private String studentId;

    @Column(length = 160)
    private String major;

    @Column(name = "academic_year", length = 80)
    private String academicYear;

    // ------------------------------------------------------------ AI tutor
    /**
     * guided | detailed
     */
    @Column(name = "tutor_response_style", nullable = false, length = 20)
    private String tutorResponseStyle;

    /**
     * encouraging | friendly | academic
     */
    @Column(name = "tutor_tone", nullable = false, length = 20)
    private String tutorTone;

    @Column(name = "tutor_auto_quiz", nullable = false)
    private boolean tutorAutoQuiz;

    // --------------------------------------------------------- study goals
    /**
     * Phút học mục tiêu mỗi ngày (15..180).
     */
    @Column(name = "daily_study_target", nullable = false)
    private int dailyStudyTarget;

    @Column(name = "auto_flashcards", nullable = false)
    private boolean autoFlashcards;

    @Column(name = "focus_mode", nullable = false)
    private boolean focusMode;

    // -------------------------------------------------------- notifications
    @Column(name = "notify_daily_reminder", nullable = false)
    private boolean notifyDailyReminder;

    @Column(name = "notify_assignment_alerts", nullable = false)
    private boolean notifyAssignmentAlerts;

    @Column(name = "notify_streak_reminder", nullable = false)
    private boolean notifyStreakReminder;

    @Column(name = "notify_weekly_summary", nullable = false)
    private boolean notifyWeeklySummary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
