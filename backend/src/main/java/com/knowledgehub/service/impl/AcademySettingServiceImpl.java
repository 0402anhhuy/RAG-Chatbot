package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.AcademySettingUpdateRequest;
import com.knowledgehub.dto.response.AcademySettingResponse;
import com.knowledgehub.entity.AcademySetting;
import com.knowledgehub.entity.User;
import com.knowledgehub.repository.AcademySettingRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.AcademySettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class AcademySettingServiceImpl implements AcademySettingService {

    private static final String STYLE_GUIDED = "guided";
    private static final String STYLE_DETAILED = "detailed";
    private static final List<String> TONES = List.of("encouraging", "friendly", "academic");

    private static final int MIN_DAILY_TARGET = 15;
    private static final int MAX_DAILY_TARGET = 180;

    private final AcademySettingRepository academySettingRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AcademySettingResponse getSetting(UUID userId) {
        User user = requireUser(userId);
        return academySettingRepository.findByUserId(userId)
                .map(AcademySettingResponse::fromEntity)
                .orElseGet(() -> AcademySettingResponse.defaults(userId, user.getName(), user.getEmail()));
    }

    @Override
    public AcademySettingResponse updateSetting(UUID userId, AcademySettingUpdateRequest request) {
        requireUser(userId);

        AcademySetting setting = academySettingRepository.findByUserId(userId).orElseGet(() -> {
            AcademySetting created = new AcademySetting();
            created.setUserId(userId);
            return created;
        });

        setting.setFullName(clean(request.fullName()));
        setting.setEmail(clean(request.email()));
        setting.setUniversity(clean(request.university()));
        setting.setStudentId(clean(request.studentId()));
        setting.setMajor(clean(request.major()));
        setting.setAcademicYear(clean(request.academicYear()));

        String style = clean(request.tutorResponseStyle());
        setting.setTutorResponseStyle(STYLE_DETAILED.equalsIgnoreCase(style) ? STYLE_DETAILED : STYLE_GUIDED);
        setting.setTutorTone(normalizeTone(request.tutorTone()));
        setting.setTutorAutoQuiz(Boolean.TRUE.equals(request.tutorAutoQuiz()));

        setting.setDailyStudyTarget(clampDailyTarget(request.dailyStudyTarget()));
        setting.setAutoFlashcards(Boolean.TRUE.equals(request.autoFlashcards()));
        setting.setFocusMode(Boolean.TRUE.equals(request.focusMode()));

        setting.setNotifyDailyReminder(Boolean.TRUE.equals(request.notifyDailyReminder()));
        setting.setNotifyAssignmentAlerts(Boolean.TRUE.equals(request.notifyAssignmentAlerts()));
        setting.setNotifyStreakReminder(Boolean.TRUE.equals(request.notifyStreakReminder()));
        setting.setNotifyWeeklySummary(Boolean.TRUE.equals(request.notifyWeeklySummary()));

        return AcademySettingResponse.fromEntity(academySettingRepository.save(setting));
    }

    // ---------------------------------------------------------------- helpers
    private User requireUser(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + userId));
    }

    /**
     * Giá trị sai kiểu hoa/thường vẫn được nhận diện, còn giá trị lạ thì rơi về
     * mặc định thay vì làm hỏng form.
     */
    private String normalizeTone(String tone) {
        String normalized = Optional.ofNullable(clean(tone)).map(value -> value.toLowerCase(Locale.ROOT)).orElse(null);
        return normalized != null && TONES.contains(normalized) ? normalized : "friendly";
    }

    private int clampDailyTarget(Integer target) {
        if (target == null) {
            return 45;
        }
        return Math.min(MAX_DAILY_TARGET, Math.max(MIN_DAILY_TARGET, target));
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
