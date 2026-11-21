package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Nội dung form tab Settings (Academy Hub). FE gửi lên đúng giá trị đang hiển
 * thị, nên record này chứa cả 4 nhóm: hồ sơ, AI Tutor, mục tiêu học tập và nhắc
 * nhở.
 *
 * <p>
 * Không dùng {@code @NotBlank} cho hồ sơ vì người học có thể để trống MSSV /
 * chuyên ngành; chỉ giới hạn độ dài.
 * </p>
 */
public record AcademySettingUpdateRequest(
        // -------------------------------------------------------- profile
        @Size(max = 120, message = "Full name must be at most 120 characters")
        String fullName,
        @Email(message = "Email address is invalid")
        @Size(max = 255, message = "Email must be at most 255 characters")
        String email,
        @Size(max = 255, message = "University must be at most 255 characters")
        String university,
        @Size(max = 40, message = "Student ID must be at most 40 characters")
        String studentId,
        @Size(max = 160, message = "Major must be at most 160 characters")
        String major,
        @Size(max = 80, message = "Academic standing must be at most 80 characters")
        String academicYear,
        // ------------------------------------------------------- AI tutor
        /**
         * guided | detailed
         */
        @NotNull(message = "Explanation approach is required")
        String tutorResponseStyle,
        /**
         * encouraging | friendly | academic
         */
        @NotNull(message = "Communication tone is required")
        String tutorTone,
        @NotNull(message = "Interactive practice setting is required")
        Boolean tutorAutoQuiz,
        // ---------------------------------------------------- study goals
        @NotNull(message = "Daily study target is required")
        @Min(value = 15, message = "Daily study target must be at least 15 minutes")
        @Max(value = 180, message = "Daily study target must be at most 180 minutes")
        Integer dailyStudyTarget,
        @NotNull(message = "Flashcard setting is required")
        Boolean autoFlashcards,
        @NotNull(message = "Focus mode setting is required")
        Boolean focusMode,
        // ---------------------------------------------------
        @NotNull(message = "Daily reminder setting is required")
        Boolean notifyDailyReminder,
        @NotNull(message = "Assignment alert setting is required")
        Boolean notifyAssignmentAlerts,
        @NotNull(message = "Streak reminder setting is required")
        Boolean notifyStreakReminder,
        @NotNull(message = "Weekly summary setting is required")
        Boolean notifyWeeklySummary) {

}
