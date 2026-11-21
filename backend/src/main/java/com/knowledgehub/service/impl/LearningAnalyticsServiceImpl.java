package com.knowledgehub.service.impl;

import com.knowledgehub.dto.response.LearningAnalyticsResponse;
import com.knowledgehub.dto.response.LearningAnalyticsResponse.KnowledgeGap;
import com.knowledgehub.dto.response.LearningAnalyticsResponse.RecentScore;
import com.knowledgehub.dto.response.LearningAnalyticsResponse.Skill;
import com.knowledgehub.dto.response.LearningAnalyticsResponse.Summary;
import com.knowledgehub.entity.Course;
import com.knowledgehub.entity.MessageRole;
import com.knowledgehub.entity.Quiz;
import com.knowledgehub.entity.QuizAttempt;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.repository.ChatMessageRepository;
import com.knowledgehub.repository.CourseRepository;
import com.knowledgehub.repository.QuizAttemptRepository;
import com.knowledgehub.repository.StudyNoteRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.service.interfaces.LearningAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class LearningAnalyticsServiceImpl implements LearningAnalyticsService {

    private static final String RANGE_7D = "7d";
    private static final String RANGE_30D = "30d";
    private static final String RANGE_ALL = "all";

    /**
     * Mỗi lượt hỏi đáp với trợ lý tính 10 phút học có hướng dẫn.
     */
    private static final double MINUTES_PER_TUTOR_EXCHANGE = 10d;

    /**
     * Ngưỡng điểm để xếp hạng competency và gắn cờ "knowledge gap".
     */
    private static final int ADVANCED_THRESHOLD = 80;
    private static final int PROFICIENT_THRESHOLD = 60;
    private static final int HIGH_PRIORITY_THRESHOLD = 50;
    private static final int MEDIUM_PRIORITY_THRESHOLD = 70;

    private static final int MAX_RECENT_SCORES = 6;
    private static final int MAX_GAPS = 6;

    /**
     * Màu thanh meter theo mức mastery (khớp bảng màu của UI).
     */
    private static final String COLOR_ADVANCED = "#059669";
    private static final String COLOR_PROFICIENT = "#0284c7";
    private static final String COLOR_WEAK = "#ef4444";

    private final QuizAttemptRepository attemptRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final StudyNoteRepository noteRepository;
    private final CourseRepository courseRepository;
    private final WorkspaceRepository workspaceRepository;

    @Override
    public LearningAnalyticsResponse getAnalytics(
            UUID ownerId, UUID workspaceId, UUID userId, String range) {
        String normalized = normalizeRange(range);
        UUID resolvedWorkspace = resolveWorkspaceId(ownerId, workspaceId);
        if (resolvedWorkspace == null || userId == null) {
            return empty(normalized);
        }

        Instant since = sinceOf(normalized);
        List<QuizAttempt> attempts = since == null
                ? attemptRepository.findByUserIdAndQuizWorkspaceIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(
                        userId, resolvedWorkspace)
                : attemptRepository
                        .findByUserIdAndQuizWorkspaceIdAndSubmittedAtIsNotNullAndSubmittedAtGreaterThanEqualOrderBySubmittedAtDesc(
                                userId, resolvedWorkspace, since);

        List<Course> courses = courseRepository.findByWorkspaceIdOrderByCreatedAtAsc(resolvedWorkspace);

        List<Skill> skills = buildSkills(attempts, courses);
        List<RecentScore> recentScores = buildRecentScores(attempts);
        List<KnowledgeGap> gaps = buildGaps(skills);
        Summary summary = buildSummary(normalized, resolvedWorkspace, since, attempts, skills, gaps, courses.size());

        return new LearningAnalyticsResponse(
                normalized,
                rangeLabel(normalized),
                summary,
                skills,
                recentScores,
                gaps);
    }

    // ------------------------------------------------------------------ KPI
    private Summary buildSummary(
            String range,
            UUID workspaceId,
            Instant since,
            List<QuizAttempt> attempts,
            List<Skill> skills,
            List<KnowledgeGap> gaps,
            long coursesCount) {

        Double overall = averageScore(attempts);
        Double delta = deltaBetweenHalves(attempts);
        long evaluatedQuestions = attempts.stream().mapToLong(QuizAttempt::getQuestionCount).sum();

        // Giờ tutoring = số lượt hỏi của người học x 10 phút.
        long exchanges = since == null
                ? chatMessageRepository.countBySessionWorkspaceIdAndRole(workspaceId, MessageRole.USER)
                : chatMessageRepository.countBySessionWorkspaceIdAndRoleAndCreatedAtGreaterThanEqual(
                        workspaceId, MessageRole.USER, since);
        Double tutoringHours = exchanges == 0
                ? null
                : round(exchanges * MINUTES_PER_TUTOR_EXCHANGE / 60d);

        // So sánh với khoảng thời gian trước đó cùng độ dài (chỉ khi range có mốc).
        Double deltaTutoring = null;
        if (since != null) {
            Instant previousSince = since.minus(Duration.between(since, Instant.now()));
            long previousExchanges = chatMessageRepository
                    .countBySessionWorkspaceIdAndRoleAndCreatedAtGreaterThanEqual(
                            workspaceId, MessageRole.USER, previousSince)
                    - exchanges;
            if (previousExchanges > 0) {
                deltaTutoring = round((exchanges - previousExchanges) * MINUTES_PER_TUTOR_EXCHANGE / 60d);
            }
        }

        long notesCount = since == null
                ? noteRepository.countByWorkspaceId(workspaceId)
                : noteRepository.countByWorkspaceIdAndCreatedAtGreaterThanEqual(workspaceId, since);

        int highPriority = (int) gaps.stream().filter(gap -> "High".equals(gap.impact())).count();

        return new Summary(
                overall,
                delta,
                tutoringHours,
                deltaTutoring,
                // "Assessment accuracy" = tỉ lệ câu đúng trên toàn bộ câu đã làm.
                accuracy(attempts),
                evaluatedQuestions,
                gaps.size(),
                highPriority,
                attempts.size(),
                notesCount,
                coursesCount);
    }

    // --------------------------------------------------------------- skills
    /**
     * Mỗi khóa học là một competency. Mastery = điểm trung bình các lượt đã nộp
     * của các đề mang đúng mã môn; khóa chưa có đề nào thì bỏ qua (không bịa
     * 0%).
     */
    private List<Skill> buildSkills(List<QuizAttempt> attempts, List<Course> courses) {
        Map<String, List<QuizAttempt>> byCourse = new LinkedHashMap<>();
        for (QuizAttempt attempt : attempts) {
            Quiz quiz = attempt.getQuiz();
            String key = courseKey(quiz);
            if (key == null) {
                continue;
            }
            byCourse.computeIfAbsent(key, ignored -> new ArrayList<>()).add(attempt);
        }

        // Tên môn lấy từ khóa học trùng mã; nếu chưa có khóa thì dùng courseTitle của đề.
        Map<String, String> titles = new LinkedHashMap<>();
        for (Course course : courses) {
            if (course.getCode() != null) {
                titles.put(course.getCode().toUpperCase(Locale.ROOT), course.getTitle());
            }
        }

        // Tên competency = các chủ đề đề kiểm tra của môn đó, để dòng skill (và
        // thẻ knowledge gap) mô tả đúng phần kiến thức chứ không lặp lại tên môn.
        Map<String, List<String>> quizTitles = new LinkedHashMap<>();
        byCourse.forEach((key, courseAttempts) -> quizTitles.put(
                key,
                courseAttempts.stream()
                        .map(attempt -> attempt.getQuiz().getTitle())
                        .filter(title -> title != null && !title.isBlank())
                        .distinct()
                        .toList()));

        List<Skill> skills = new ArrayList<>();
        byCourse.forEach((key, courseAttempts) -> {
            double average = courseAttempts.stream().mapToInt(QuizAttempt::scorePercent).average().orElse(0);
            int mastery = (int) Math.round(average);
            String courseTitle = titles.getOrDefault(key, courseAttempts.get(0).getQuiz().getCourseTitle());
            List<String> topics = quizTitles.getOrDefault(key, List.of());
            String skillName = topics.isEmpty() ? courseTitle : String.join(" · ", topics);

            skills.add(new Skill(
                    key,
                    courseTitle,
                    skillName != null && !skillName.isBlank() ? skillName : key,
                    mastery,
                    statusOf(mastery),
                    colorOf(mastery),
                    courseAttempts.size()));
        });

        // Yếu nhất đứng trước để phần remediation dễ thấy nhất.
        skills.sort(Comparator.comparingInt(Skill::mastery));
        return skills;
    }

    private List<RecentScore> buildRecentScores(List<QuizAttempt> attempts) {
        // Duyệt từ mới nhất về cũ; "seen" giữ điểm của lượt MỚI HƠN cùng đề để
        // delta = điểm lượt này - điểm lượt liền sau (nếu có).
        List<RecentScore> result = new ArrayList<>();
        List<QuizAttempt> ascending = new ArrayList<>(attempts);
        // submittedAt có thể trùng nhau (nộp liền tay) nên thêm startedAt làm khoá phụ
        // để thứ tự luôn xác định và delta của cùng đề không bị mất.
        ascending.sort(Comparator
                .comparing(QuizAttempt::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(QuizAttempt::getStartedAt, Comparator.nullsLast(Comparator.naturalOrder())));

        // "seen" giữ điểm của lượt MỚI HƠN cùng đề, nên delta của lượt cũ hơn =
        // điểm lượt này - điểm lượt liền sau, đúng chiều tăng/giảm của người học.
        Map<UUID, Integer> seen = new LinkedHashMap<>();

        for (int index = ascending.size() - 1; index >= 0 && result.size() < MAX_RECENT_SCORES; index--) {
            QuizAttempt attempt = ascending.get(index);
            UUID quizId = attempt.getQuiz().getId();
            Integer prior = seen.get(quizId);

            double delta = prior == null ? 0 : attempt.scorePercent() - prior;
            result.add(new RecentScore(
                    attempt.getId(),
                    quizId,
                    examLabel(attempt.getQuiz()),
                    attempt.scorePercent(),
                    relative(attempt.getSubmittedAt()),
                    prior == null ? null : round(delta)));
            seen.put(quizId, attempt.scorePercent());
        }

        return result;
    }

    private List<KnowledgeGap> buildGaps(List<Skill> skills) {
        return skills.stream()
                .filter(skill -> skill.mastery() < ADVANCED_THRESHOLD)
                .limit(MAX_GAPS)
                .map(skill -> new KnowledgeGap(
                        null,
                        skill.courseCode(),
                        skill.skill(),
                        impactOf(skill.mastery()),
                        reasonOf(skill),
                        skill.mastery() < PROFICIENT_THRESHOLD ? "tutor" : "exam_prep"))
                .toList();
    }

    // ---------------------------------------------------------------- helpers
    private String reasonOf(Skill skill) {
        int wrongRough = Math.max(0, 100 - skill.mastery());
        return "Average mastery " + skill.mastery() + "% across " + skill.attempts()
                + " submitted attempt(s) — about " + wrongRough
                + "% of questions were answered incorrectly in this course.";
    }

    private Double averageScore(List<QuizAttempt> attempts) {
        if (attempts.isEmpty()) {
            return null;
        }
        return round(attempts.stream().mapToInt(QuizAttempt::scorePercent).average().orElse(0));
    }

    private Double accuracy(List<QuizAttempt> attempts) {
        long total = attempts.stream().mapToLong(QuizAttempt::getQuestionCount).sum();
        if (total == 0) {
            return null;
        }
        long correct = attempts.stream().mapToLong(QuizAttempt::getCorrectCount).sum();
        return round(correct * 100d / total);
    }

    /**
     * So sánh điểm trung bình nửa sau với nửa đầu của khoảng (theo thời gian).
     * Chưa đủ 2 lượt thì không kết luận xu hướng.
     */
    private Double deltaBetweenHalves(List<QuizAttempt> attempts) {
        if (attempts.size() < 2) {
            return null;
        }
        List<QuizAttempt> ascending = new ArrayList<>(attempts);
        ascending.sort(Comparator
                .comparing(QuizAttempt::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(QuizAttempt::getStartedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        int mid = ascending.size() / 2;

        double firstHalf = ascending.subList(0, mid).stream()
                .mapToInt(QuizAttempt::scorePercent).average().orElse(0);
        double secondHalf = ascending.subList(mid, ascending.size()).stream()
                .mapToInt(QuizAttempt::scorePercent).average().orElse(0);
        return round(secondHalf - firstHalf);
    }

    private String statusOf(int mastery) {
        if (mastery >= ADVANCED_THRESHOLD) {
            return "Advanced";
        }
        if (mastery >= PROFICIENT_THRESHOLD) {
            return "Proficient";
        }
        return "Needs Practice";
    }

    private String colorOf(int mastery) {
        if (mastery >= ADVANCED_THRESHOLD) {
            return COLOR_ADVANCED;
        }
        if (mastery >= PROFICIENT_THRESHOLD) {
            return COLOR_PROFICIENT;
        }
        return COLOR_WEAK;
    }

    private String impactOf(int mastery) {
        if (mastery < HIGH_PRIORITY_THRESHOLD) {
            return "High";
        }
        return mastery < MEDIUM_PRIORITY_THRESHOLD ? "Medium" : "Low";
    }

    private String courseKey(Quiz quiz) {
        if (quiz.getCourseCode() != null && !quiz.getCourseCode().isBlank()) {
            return quiz.getCourseCode().trim().toUpperCase(Locale.ROOT);
        }
        if (quiz.getCourseTitle() != null && !quiz.getCourseTitle().isBlank()) {
            return quiz.getCourseTitle().trim().toUpperCase(Locale.ROOT);
        }
        return null;
    }

    private String examLabel(Quiz quiz) {
        String code = quiz.getCourseCode() == null || quiz.getCourseCode().isBlank()
                ? ""
                : quiz.getCourseCode() + ": ";
        return code + quiz.getTitle();
    }

    private String relative(Instant instant) {
        if (instant == null) {
            return "";
        }
        long minutes = Duration.between(instant, Instant.now()).toMinutes();
        if (minutes < 1) {
            return "Just now";
        }
        if (minutes < 60) {
            return "Today";
        }
        long hours = minutes / 60;
        if (hours < 24) {
            return hours == 1 ? "1 hour ago" : hours + " hours ago";
        }
        long days = hours / 24;
        if (days == 1) {
            return "Yesterday";
        }
        if (days < 7) {
            return days + " days ago";
        }
        long weeks = days / 7;
        return weeks == 1 ? "1 week ago" : weeks + " weeks ago";
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
                "7 Days";
            case RANGE_ALL ->
                "Full Term";
            default ->
                "30 Days";
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

    private UUID resolveWorkspaceId(UUID ownerId, UUID workspaceId) {
        if (workspaceId != null) {
            return workspaceId;
        }
        if (ownerId == null) {
            return null;
        }
        List<Workspace> owned = workspaceRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        return owned.isEmpty() ? null : owned.get(0).getId();
    }

    private LearningAnalyticsResponse empty(String range) {
        return new LearningAnalyticsResponse(
                range,
                rangeLabel(range),
                new Summary(null, null, null, null, null, 0, 0, 0, 0, 0, 0),
                List.of(),
                List.of(),
                List.of());
    }

    private Double round(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
