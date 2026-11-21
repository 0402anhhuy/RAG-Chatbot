package com.knowledgehub.dto.response;

import com.knowledgehub.entity.AcademySetting;

import java.time.Instant;
import java.util.UUID;

/**
 * Trạng thái tab Settings (Academy Hub) đọc từ {@link AcademySetting}.
 *
 * <p>
 * Khi user chưa lưu lần nào, service trả về giá trị mặc định và
 * {@code saved=false} để FE biết đây là cấu hình khởi tạo chứ không phải dữ
 * liệu người dùng đã đặt.
 * </p>
 *
 * @param tutorResponseStyle guided | detailed
 * @param tutorTone encouraging | friendly | academic
 */
public record AcademySettingResponse(
        UUID userId,
        boolean saved,
        Profile profile,
        AiTutor aiTutor,
        StudyGoals studyGoals,
        Notifications notifications,
        Instant updatedAt) {

    /**
     * Khối "Student Profile Information".
     */
    public record Profile(
            String fullName,
            String email,
            String university,
            String studentId,
            String major,
            String academicYear) {

        static Profile fromEntity(AcademySetting setting) {
            return new Profile(
                    setting.getFullName(),
                    setting.getEmail(),
                    setting.getUniversity(),
                    setting.getStudentId(),
                    setting.getMajor(),
                    setting.getAcademicYear());
        }
    }

    /**
     * Khối "AI Tutor Teaching Style".
     */
    public record AiTutor(
            String responseStyle,
            String tone,
            boolean autoQuiz) {

        static AiTutor fromEntity(AcademySetting setting) {
            return new AiTutor(
                    setting.getTutorResponseStyle(),
                    setting.getTutorTone(),
                    setting.isTutorAutoQuiz());
        }
    }

    /**
     * Khối "Daily Study Goals & Review Habits".
     *
     * @param dailyStudyTarget phút/ngày
     */
    public record StudyGoals(
            int dailyStudyTarget,
            boolean autoFlashcards,
            boolean focusMode) {

        static StudyGoals fromEntity(AcademySetting setting) {
            return new StudyGoals(
                    setting.getDailyStudyTarget(),
                    setting.isAutoFlashcards(),
                    setting.isFocusMode());
        }
    }

    /**
     * Khối "Reminders & Schedule Alerts".
     */
    public record Notifications(
            boolean dailyReminder,
            boolean assignmentAlerts,
            boolean streakReminder,
            boolean weeklySummary) {

        static Notifications fromEntity(AcademySetting setting) {
            return new Notifications(
                    setting.isNotifyDailyReminder(),
                    setting.isNotifyAssignmentAlerts(),
                    setting.isNotifyStreakReminder(),
                    setting.isNotifyWeeklySummary());
        }
    }

    // ------------------------------------------------------------ factories
    /**
     * Chưa có bản ghi: trả mặc định, giữ email từ tài khoản (nếu biết) để form
     * không trống.
     */
    public static AcademySettingResponse defaults(UUID userId, String accountName, String accountEmail) {
        return new AcademySettingResponse(
                userId,
                false,
                new Profile(accountName, accountEmail, null, null, null, null),
                new AiTutor("guided", "friendly", true),
                new StudyGoals(45, true, true),
                new Notifications(true, true, true, true),
                null);
    }

    public static AcademySettingResponse fromEntity(AcademySetting setting) {
        return new AcademySettingResponse(
                setting.getUserId(),
                true,
                Profile.fromEntity(setting),
                AiTutor.fromEntity(setting),
                StudyGoals.fromEntity(setting),
                Notifications.fromEntity(setting),
                setting.getUpdatedAt());
    }
}
