package com.knowledgehub.service.impl;

import com.knowledgehub.dto.response.AcademyHomeResponse;
import com.knowledgehub.dto.response.AcademyHomeResponse.ContinueLearning;
import com.knowledgehub.dto.response.AcademyHomeResponse.CourseProgress;
import com.knowledgehub.dto.response.AcademyHomeResponse.Kpi;
import com.knowledgehub.dto.response.AcademyHomeResponse.Recommendation;
import com.knowledgehub.dto.response.AcademyHomeResponse.StudyStreak;
import com.knowledgehub.dto.response.AcademyHomeResponse.SyllabusVectorization;
import com.knowledgehub.entity.AcademySetting;
import com.knowledgehub.entity.AcademyToolRun;
import com.knowledgehub.entity.AcademyToolType;
import com.knowledgehub.entity.Course;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.DocumentStatus;
import com.knowledgehub.entity.MessageRole;
import com.knowledgehub.entity.QuizAttempt;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.repository.AcademySettingRepository;
import com.knowledgehub.repository.AcademyToolRunRepository;
import com.knowledgehub.repository.ChatMessageRepository;
import com.knowledgehub.repository.CourseRepository;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.QuizAttemptRepository;
import com.knowledgehub.repository.StudyNoteRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.service.interfaces.AcademyHomeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Tab Home (Academy Hub) không có bảng riêng: mọi con số ở đây được đọc lại từ
 * dữ liệu của các tab khác trong cùng workspace, nên Home không bao giờ lệch
 * với Courses / Quizzes / Conversations / Tools / Settings.
 *
 * <p>
 * Nguyên tắc: không bịa số. Khi chưa có dữ liệu, KPI trả {@code hasData=false}
 * và giá trị "—" để UI hiện trạng thái trống đúng nghĩa.
 * </p>
 *
 * <ul>
 * <li>Active Courses — course chưa archived của workspace.</li>
 * <li>Average Mastery — độ chính xác câu trả lời của các lượt đã nộp.</li>
 * <li>Quizzes Solved — số lượt nộp trong khoảng thời gian đang xét.</li>
 * <li>Study Time — thời gian đọc tài liệu + lượt hỏi trợ lý + ghi chú.</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AcademyHomeServiceImpl implements AcademyHomeService {

    private static final String RANGE_7D = "7d";
    private static final String RANGE_30D = "30d";
    private static final String RANGE_ALL = "all";

    /**
     * Phút học quy đổi cho mỗi chunk tài liệu đã index (đọc + ghi chú).
     */
    private static final double MINUTES_PER_CHUNK = 1.5d;

    /**
     * Mỗi lượt hỏi đáp với trợ lý tính 5 phút học có hướng dẫn.
     */
    private static final double MINUTES_PER_TUTOR_EXCHANGE = 5d;

    /**
     * Mỗi ghi chú học tập tính 10 phút.
     */
    private static final double MINUTES_PER_NOTE = 10d;

    /**
     * Môn dưới ngưỡng này được coi là điểm yếu cần luyện lại.
     */
    private static final int WEAK_MASTERY_THRESHOLD = 80;

    private static final int MAX_COURSES = 4;
    private static final int MAX_RECOMMENDATIONS = 3;
    private static final int DEFAULT_RUN_HISTORY = 10;
    private static final int DEFAULT_DAILY_TARGET_MINUTES = 45;
    private static final ZoneId ZONE = ZoneId.systemDefault();

    private final CourseRepository courseRepository;
    private final DocumentRepository documentRepository;
    private final QuizAttemptRepository attemptRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final StudyNoteRepository noteRepository;
    private final AcademyToolRunRepository toolRunRepository;
    private final AcademySettingRepository settingRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;

    @Override
    public AcademyHomeResponse getHome(UUID ownerId, UUID workspaceId, String range) {
        String normalizedRange = normalizeRange(range);
        Workspace workspace = resolveWorkspace(ownerId, workspaceId);
        if (workspace == null) {
            return empty(ownerId, normalizedRange);
        }

        UUID learnerId = ownerId != null
                ? ownerId
                : workspace.getOwner() != null ? workspace.getOwner().getId() : null;
        Instant since = sinceOf(normalizedRange);

        List<Course> courses = courseRepository.findByWorkspaceIdOrderByCreatedAtAsc(workspace.getId())
                .stream()
                .filter(course -> !course.isArchived())
                .toList();
        List<Document> documents = documentRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspace.getId());
        List<QuizAttempt> attempts = attemptsOf(learnerId, workspace.getId(), since);
        List<QuizAttempt> submitted = attempts.stream().filter(QuizAttempt::isSubmitted).toList();

        return new AcademyHomeResponse(
                greetingOf(),
                learnerNameOf(learnerId, workspace),
                continueLearningOf(courses),
                streakOf(learnerId, workspace.getId()),
                vectorizationOf(documents),
                kpisOf(workspace, courses, submitted, normalizedRange, learnerId),
                courses.stream().limit(MAX_COURSES).map(course -> toProgress(course, documents)).toList(),
                recommendationsOf(learnerId, courses, submitted, documents),
                Instant.now());
    }

    // --------------------------------------------------------------- banner
    /**
     * Khóa đang học tiến xa nhất (chưa xong) là bài nên học tiếp; học xong hết
     * thì lấy khóa có hoạt động gần nhất để quay lại ôn.
     */
    private ContinueLearning continueLearningOf(List<Course> courses) {
        if (courses.isEmpty()) {
            return new ContinueLearning(null, null, null, null, null, 0);
        }
        Course next = courses.stream()
                .filter(course -> course.progressPercent() < 100)
                .max(Comparator.comparingInt(Course::progressPercent)
                        .thenComparing(Course::getUpdatedAt,
                                Comparator.nullsFirst(Comparator.naturalOrder())))
                .orElseGet(() -> courses.stream()
                        .max(Comparator.comparing(Course::getUpdatedAt,
                                Comparator.nullsFirst(Comparator.naturalOrder())))
                        .orElse(courses.get(0)));

        int progress = next.progressPercent();
        boolean finished = next.getTotalLessons() > 0 && next.getCompletedLessons() >= next.getTotalLessons();
        String nextLesson = finished
                ? "Course complete — revise with the tutor"
                : next.getTotalLessons() > 0
                ? "Lesson " + (next.getCompletedLessons() + 1) + " of " + next.getTotalLessons()
                : "Add lessons to this course";
        String step = next.getTotalLessons() > 0
                ? "Lesson " + next.getCompletedLessons() + " of " + next.getTotalLessons()
                + " · " + progress + "% complete"
                : "No lessons planned yet";

        return new ContinueLearning(
                next.getId(),
                next.getCode(),
                next.getTitle(),
                nextLesson,
                step,
                progress);
    }

    // --------------------------------------------------------------- streak
    /**
     * Chuỗi ngày học liên tiếp: gom các ngày có hoạt động thật (lượt nộp quiz,
     * tin nhắn hỏi trợ lý, ghi chú, lượt chạy tool) rồi đếm ngược từ hôm nay;
     * hôm nay chưa học thì chuỗi vẫn còn nếu hôm qua có học.
     */
    private StudyStreak streakOf(UUID learnerId, UUID workspaceId) {
        if (learnerId == null) {
            return new StudyStreak(0, false, null);
        }
        Set<LocalDate> activeDays = new HashSet<>();
        Instant lastActive = null;

        List<Instant> events = new ArrayList<>();
        for (QuizAttempt attempt : attemptRepository.findByUserIdAndQuizWorkspaceIdOrderByStartedAtDesc(
                learnerId, workspaceId)) {
            events.add(attempt.getSubmittedAt() != null ? attempt.getSubmittedAt() : attempt.getStartedAt());
        }
        events.addAll(chatMessageRepository.findUserMessageTimestamps(workspaceId, MessageRole.USER));
        events.addAll(noteRepository.findCreatedAtByWorkspaceId(workspaceId));
        for (AcademyToolRun run : toolRunRepository.findByUserIdOrderByCreatedAtDesc(learnerId)) {
            events.add(run.getCreatedAt());
        }

        for (Instant event : events) {
            if (event == null) {
                continue;
            }
            activeDays.add(event.atZone(ZONE).toLocalDate());
            if (lastActive == null || event.isAfter(lastActive)) {
                lastActive = event;
            }
        }

        LocalDate today = LocalDate.now(ZONE);
        boolean activeToday = activeDays.contains(today);
        LocalDate cursor = activeToday ? today : today.minusDays(1);
        int days = 0;
        while (activeDays.contains(cursor)) {
            days++;
            cursor = cursor.minusDays(1);
        }
        return new StudyStreak(days, activeToday, lastActive);
    }

    // -------------------------------------------------------- vectorization
    /**
     * Trạng thái vector hoá courseware — cùng nguồn với metric trên navbar và
     * danh sách Documents, nên không thể lệch nhau.
     */
    private SyllabusVectorization vectorizationOf(List<Document> documents) {
        int indexed = 0;
        int processing = 0;
        for (Document document : documents) {
            if (document.getStatus() == DocumentStatus.READY) {
                indexed++;
            } else if (document.getStatus() == DocumentStatus.PENDING
                    || document.getStatus() == DocumentStatus.UPLOADED
                    || document.getStatus() == DocumentStatus.PROCESSING) {
                processing++;
            }
        }
        return new SyllabusVectorization(indexed, processing, documents.size());
    }

    // ------------------------------------------------------------------ KPI
    private List<Kpi> kpisOf(
            Workspace workspace,
            List<Course> courses,
            List<QuizAttempt> submitted,
            String range,
            UUID learnerId) {

        // 1. Active Courses: khóa chưa học xong.
        int activeCourses = (int) courses.stream()
                .filter(course -> course.progressPercent() < 100)
                .count();

        // 2. Average Mastery: tỉ lệ câu đúng trên toàn bộ câu đã làm.
        long answered = submitted.stream().mapToLong(QuizAttempt::getQuestionCount).sum();
        long correct = submitted.stream().mapToLong(QuizAttempt::getCorrectCount).sum();
        Double mastery = answered == 0 ? null : round(correct * 100d / answered);

        // 3. Quizzes Solved: số lượt đã nộp (làm lại một đề vẫn tính một lượt).
        long solved = submitted.size();
        long solvedAllTime = learnerId == null
                ? solved
                : attemptRepository.countByUserIdAndSubmittedAtIsNotNull(learnerId);

        // 4. Study Time: chunks đã index + lượt hỏi + ghi chú trong khoảng.
        Instant studySince = sinceOf(range);
        Instant from = studySince != null ? studySince : Instant.EPOCH;
        long chunks = documentRepository.findByWorkspaceId(workspace.getId()).stream()
                .filter(document -> document.getStatus() == DocumentStatus.READY)
                .mapToInt(Document::getChunkCount)
                .sum();
        long exchanges = chatMessageRepository.countBySessionWorkspaceIdAndRoleAndCreatedAtGreaterThanEqual(
                workspace.getId(), MessageRole.USER, from);
        long notes = noteRepository.countByWorkspaceIdAndCreatedAtGreaterThanEqual(workspace.getId(), from);
        double minutes = chunks * MINUTES_PER_CHUNK
                + exchanges * MINUTES_PER_TUTOR_EXCHANGE
                + notes * MINUTES_PER_NOTE;
        Double studyHours = minutes <= 0 ? null : round(minutes / 60d);

        // Mục tiêu ngày trong Settings giúp dòng note có ngữ cảnh thật.
        int dailyTarget = learnerId == null
                ? DEFAULT_DAILY_TARGET_MINUTES
                : settingRepository.findByUserId(learnerId)
                        .map(AcademySetting::getDailyStudyTarget)
                        .orElse(DEFAULT_DAILY_TARGET_MINUTES);

        List<Kpi> kpis = new ArrayList<>();
        kpis.add(new Kpi(
                "active_courses",
                "Active Courses",
                String.valueOf(activeCourses),
                activeCourses == 0 ? "none enrolled" : "in progress",
                "courses",
                (double) activeCourses,
                true));

        kpis.add(new Kpi(
                "average_mastery",
                "Average Mastery",
                mastery == null ? "—" : Math.round(mastery) + "%",
                mastery == null ? "no submitted quizzes yet" : "answer accuracy",
                "analytics",
                mastery,
                mastery != null));

        kpis.add(new Kpi(
                "quizzes_solved",
                "Quizzes Solved",
                String.valueOf(solved),
                rangeLabel(range) + " · " + solvedAllTime + " all time",
                "quizzes",
                (double) solved,
                true));

        kpis.add(new Kpi(
                "study_time",
                "Study Time",
                studyHours == null ? "—" : studyHours + "h",
                studyHours == null
                        ? "no study activity yet"
                        : rangeLabel(range) + " · target " + dailyTarget + " min/day",
                "analytics",
                studyHours,
                studyHours != null));

        return kpis;
    }

    // ---------------------------------------------------------- course rows
    private CourseProgress toProgress(Course course, List<Document> documents) {
        int progress = course.progressPercent();
        String nextLesson = course.getTotalLessons() > 0 && course.getCompletedLessons() < course.getTotalLessons()
                ? "Lesson " + (course.getCompletedLessons() + 1) + " of " + course.getTotalLessons()
                : null;
        long docsCount = documents.stream()
                .filter(document -> course.getCode() != null
                        && course.getCode().equalsIgnoreCase(document.getCourseCode()))
                .count();
        return new CourseProgress(
                course.getId(),
                course.getCode(),
                course.getTitle(),
                progress,
                nextLesson,
                course.getCompletedLessons(),
                course.getTotalLessons(),
                (int) docsCount);
    }

    // ------------------------------------------------------ recommendations
    /**
     * Gợi ý lấy từ dữ liệu thật, theo thứ tự ưu tiên:
     * <ol>
     * <li>Môn yếu nhất (điểm trung bình &lt; 80%) → sinh drill luyện đề.</li>
     * <li>Đề do Exam Prep sinh gần nhất mà chưa có lượt nộp → làm nốt.</li>
     * <li>Lượt Assignment Grader đang xếp hàng → hoàn tất nộp bài.</li>
     * </ol>
     * Không có tín hiệu nào thì gợi ý môn có tiến độ thấp nhất; vẫn không có
     * thì trả rỗng để UI báo đã hoàn thành mục tiêu.
     */
    private List<Recommendation> recommendationsOf(
            UUID learnerId,
            List<Course> courses,
            List<QuizAttempt> submitted,
            List<Document> documents) {

        List<Recommendation> recommendations = new ArrayList<>();

        // 1. Môn yếu nhất tính từ các lượt đã nộp.
        String weakestCode = submitted.stream()
                .filter(attempt -> attempt.getQuiz() != null && attempt.getQuiz().getCourseCode() != null)
                .collect(Collectors.groupingBy(
                        attempt -> attempt.getQuiz().getCourseCode().toUpperCase(Locale.ROOT),
                        LinkedHashMap::new,
                        Collectors.averagingInt(QuizAttempt::scorePercent)))
                .entrySet().stream()
                .filter(entry -> entry.getValue() < WEAK_MASTERY_THRESHOLD)
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        if (weakestCode != null) {
            String title = courses.stream()
                    .filter(course -> course.getCode() != null && course.getCode().equalsIgnoreCase(weakestCode))
                    .map(Course::getTitle)
                    .findFirst()
                    .orElse(weakestCode);
            long chunks = documents.stream()
                    .filter(document -> document.getStatus() == DocumentStatus.READY)
                    .filter(document -> document.getCourseCode() != null
                            && document.getCourseCode().equalsIgnoreCase(weakestCode))
                    .mapToLong(Document::getChunkCount)
                    .sum();
            recommendations.add(new Recommendation(
                    "weakest_course",
                    "Adaptive drill on " + title,
                    chunks == 0
                            ? "Index course material first · adaptive difficulty"
                            : chunks + " indexed chunks · adaptive difficulty",
                    "exam_prep",
                    weakestCode));
        }

        if (learnerId != null) {
            // 2. Đề đã sinh nhưng chưa làm xong.
            List<AcademyToolRun> examRuns = toolRunRepository
                    .findByUserIdAndToolTypeOrderByCreatedAtDesc(learnerId, AcademyToolType.EXAM_PREP)
                    .stream()
                    .limit(DEFAULT_RUN_HISTORY)
                    .filter(run -> run.getQuizId() != null)
                    .toList();
            for (AcademyToolRun run : examRuns) {
                Optional<QuizAttempt> latest = attemptRepository
                        .findFirstByQuizIdAndUserIdOrderByStartedAtDesc(run.getQuizId(), learnerId);
                if (latest.isEmpty() || !latest.get().isSubmitted()) {
                    recommendations.add(new Recommendation(
                            "pending_drill",
                            summaryOr(run.getSummary(), "Finish your latest generated drill"),
                            "Generated " + relative(run.getCreatedAt()) + " · start full assessment",
                            "exam_prep",
                            null));
                    break;
                }
            }

            // 3. Bài nộp đang chờ chấm (grader queued).
            toolRunRepository
                    .findByUserIdAndToolTypeOrderByCreatedAtDesc(learnerId, AcademyToolType.GRADER)
                    .stream()
                    .filter(run -> "queued".equalsIgnoreCase(run.getStatus()))
                    .findFirst()
                    .ifPresent(run -> recommendations.add(new Recommendation(
                            "queued_grading",
                            summaryOr(run.getSummary(), "A submission is waiting for a rubric"),
                            "Queued " + relative(run.getCreatedAt()) + " · open Assignment Grader",
                            "grader",
                            null)));
        }

        // 4. Chưa có tín hiệu yếu kém: gợi ý môn tiến độ thấp nhất để luyện tiếp.
        if (recommendations.isEmpty()) {
            courses.stream()
                    .filter(course -> course.progressPercent() < 100)
                    .min(Comparator.comparingInt(Course::progressPercent))
                    .ifPresent(course -> recommendations.add(new Recommendation(
                            "next_course",
                            "Practice " + course.getTitle(),
                            "At " + course.progressPercent() + "% · " + course.getCompletedLessons()
                            + "/" + course.getTotalLessons() + " lessons done",
                            "exam_prep",
                            course.getCode())));
        }

        return recommendations.stream().limit(MAX_RECOMMENDATIONS).toList();
    }

    // ---------------------------------------------------------------- data
    /**
     * Lượt làm bài đã nộp của người học trong workspace (mọi lượt nếu since =
     * null).
     */
    private List<QuizAttempt> attemptsOf(UUID learnerId, UUID workspaceId, Instant since) {
        if (learnerId == null) {
            return List.of();
        }
        return since == null
                ? attemptRepository.findByUserIdAndQuizWorkspaceIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(
                        learnerId, workspaceId)
                : attemptRepository
                        .findByUserIdAndQuizWorkspaceIdAndSubmittedAtIsNotNullAndSubmittedAtGreaterThanEqualOrderBySubmittedAtDesc(
                                learnerId, workspaceId, since);
    }

    private String learnerNameOf(UUID learnerId, Workspace workspace) {
        if (learnerId != null) {
            Optional<User> user = userRepository.findById(learnerId);
            if (user.isPresent() && user.get().getName() != null && !user.get().getName().isBlank()) {
                return user.get().getName();
            }
        }
        if (workspace.getOwner() != null && workspace.getOwner().getName() != null) {
            return workspace.getOwner().getName();
        }
        return "Learner";
    }

    private Workspace resolveWorkspace(UUID ownerId, UUID workspaceId) {
        if (workspaceId != null) {
            return workspaceRepository.findById(workspaceId).orElse(null);
        }
        if (ownerId == null) {
            return null;
        }
        List<Workspace> owned = workspaceRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        return owned.isEmpty() ? null : owned.get(0);
    }

    // -------------------------------------------------------------- helpers
    private AcademyHomeResponse empty(UUID ownerId, String range) {
        String name = ownerId == null
                ? "Learner"
                : userRepository.findById(ownerId).map(User::getName).orElse("Learner");
        return new AcademyHomeResponse(
                greetingOf(),
                name,
                new ContinueLearning(null, null, null, null, null, 0),
                new StudyStreak(0, false, null),
                new SyllabusVectorization(0, 0, 0),
                List.of(
                        new Kpi("active_courses", "Active Courses", "0", "none enrolled", "courses", 0d, true),
                        new Kpi("average_mastery", "Average Mastery", "—", "no submitted quizzes yet",
                                "analytics", null, false),
                        new Kpi("quizzes_solved", "Quizzes Solved", "0", rangeLabel(range) + " · 0 all time",
                                "quizzes", 0d, true),
                        new Kpi("study_time", "Study Time", "—", "no study activity yet",
                                "analytics", null, false)),
                List.of(),
                List.of(),
                Instant.now());
    }

    private String greetingOf() {
        int hour = ZonedDateTime.now(ZONE).getHour();
        if (hour < 12) {
            return "morning";
        }
        return hour < 18 ? "afternoon" : "evening";
    }

    private String summaryOr(String summary, String fallback) {
        return summary == null || summary.isBlank() ? fallback : summary;
    }

    private String normalizeRange(String range) {
        if (range == null || range.isBlank()) {
            return RANGE_30D;
        }
        return switch (range.trim().toLowerCase(Locale.ROOT)) {
            case RANGE_7D, "7", "7days" ->
                RANGE_7D;
            case RANGE_ALL, "full", "term", "full-term" ->
                RANGE_ALL;
            default ->
                RANGE_30D;
        };
    }

    private String rangeLabel(String range) {
        return switch (range) {
            case RANGE_7D ->
                "last 7 days";
            case RANGE_ALL ->
                "this term";
            default ->
                "last 30 days";
        };
    }

    private Instant sinceOf(String range) {
        return switch (range) {
            case RANGE_7D ->
                Instant.now().minus(Duration.ofDays(7));
            case RANGE_ALL ->
                null;
            default ->
                Instant.now().minus(Duration.ofDays(30));
        };
    }

    private String relative(Instant instant) {
        if (instant == null) {
            return "";
        }
        long minutes = Duration.between(instant, Instant.now()).toMinutes();
        if (minutes < 1) {
            return "just now";
        }
        if (minutes < 60) {
            return minutes + " min ago";
        }
        long hours = minutes / 60;
        if (hours < 24) {
            return hours == 1 ? "1 hour ago" : hours + " hours ago";
        }
        long days = hours / 24;
        if (days == 1) {
            return "yesterday";
        }
        if (days < 7) {
            return days + " days ago";
        }
        long weeks = days / 7;
        return weeks == 1 ? "1 week ago" : weeks + " weeks ago";
    }

    private Double round(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
