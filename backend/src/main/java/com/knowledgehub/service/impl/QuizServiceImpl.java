package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.QuizAttemptRequest;
import com.knowledgehub.dto.request.QuizCreateRequest;
import com.knowledgehub.dto.request.QuizUpdateRequest;
import com.knowledgehub.dto.response.QuizResponse;
import com.knowledgehub.dto.response.QuizStatsResponse;
import com.knowledgehub.entity.Quiz;
import com.knowledgehub.entity.QuizAttempt;
import com.knowledgehub.entity.QuizQuestion;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.repository.QuizAttemptRepository;
import com.knowledgehub.repository.QuizQuestionRepository;
import com.knowledgehub.repository.QuizRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class QuizServiceImpl implements QuizService {

    private static final String STATUS_NEW = "NEW";
    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_ALGORITHM_PREFIX = "ALGORITHM";

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository questionRepository;
    private final QuizAttemptRepository attemptRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;

    // ------------------------------------------------------------------ read
    @Override
    @Transactional(readOnly = true)
    public List<QuizResponse> getQuizzes(
            UUID ownerId, UUID workspaceId, UUID userId, String status, String search) {
        List<Quiz> quizzes = resolveQuizzes(ownerId, workspaceId);

        String keyword = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String normalizedStatus = normalizeStatus(status);

        return quizzes.stream()
                .filter(quiz -> !quiz.isArchived())
                .filter(quiz -> matches(quiz, keyword))
                .map(quiz -> toResponse(quiz, userId))
                .filter(response -> normalizedStatus == null || response.status().equals(normalizedStatus))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public QuizResponse getQuiz(UUID quizId, UUID userId) {
        return toResponse(findQuiz(quizId), userId);
    }

    @Override
    @Transactional(readOnly = true)
    public QuizStatsResponse getStats(UUID ownerId, UUID workspaceId, UUID userId) {
        List<Quiz> quizzes = resolveQuizzes(ownerId, workspaceId).stream()
                .filter(quiz -> !quiz.isArchived())
                .toList();

        List<QuizResponse> responses = quizzes.stream().map(quiz -> toResponse(quiz, userId)).toList();

        long completed = responses.stream().filter(item -> STATUS_COMPLETED.equals(item.status())).count();
        long inProgress = responses.stream().filter(item -> STATUS_IN_PROGRESS.equals(item.status())).count();
        long notStarted = responses.stream().filter(item -> STATUS_NEW.equals(item.status())).count();

        // Điểm trung bình chỉ tính trên đề đã nộp; chưa có bài nào thì trả null
        // để UI hiện "—" thay vì 0% gây hiểu nhầm.
        List<QuizResponse> scored = responses.stream()
                .filter(item -> item.scorePercent() != null)
                .toList();
        Double average = scored.isEmpty()
                ? null
                : round(scored.stream().mapToInt(QuizResponse::scorePercent).average().orElse(0));

        long reviewedQuestions = attemptRepository
                .findByUserIdAndQuizWorkspaceIdOrderByStartedAtDesc(userId, resolveWorkspaceId(ownerId, workspaceId))
                .stream()
                .filter(QuizAttempt::isSubmitted)
                .mapToLong(QuizAttempt::getQuestionCount)
                .sum();

        // "Algorithmic precision" = điểm trung bình của các đề có mã môn bắt đầu
        // bằng ALGORITHM (mặc định là môn thuật toán); không có thì null.
        List<QuizResponse> algorithmQuizzes = scored.stream()
                .filter(item -> item.courseCode() != null
                        && item.courseCode().toUpperCase(Locale.ROOT).startsWith(STATUS_ALGORITHM_PREFIX))
                .toList();
        Double precision = algorithmQuizzes.isEmpty()
                ? null
                : round(algorithmQuizzes.stream().mapToInt(QuizResponse::scorePercent).average().orElse(0));

        List<QuizStatsResponse.QuizAverage> averages = responses.stream()
                .filter(item -> item.scorePercent() != null)
                .map(item -> new QuizStatsResponse.QuizAverage(
                        item.title(), item.courseCode(), item.scorePercent(), item.attempts()))
                .toList();

        return new QuizStatsResponse(
                completed,
                average,
                reviewedQuestions,
                precision,
                responses.size(),
                notStarted,
                inProgress,
                completed,
                averages);
    }

    // ----------------------------------------------------------------- write
    @Override
    public QuizResponse create(UUID ownerId, QuizCreateRequest request) {
        Workspace workspace = resolveWorkspace(ownerId, request.workspaceId());
        if (request.questions() == null || request.questions().isEmpty()) {
            throw new IllegalArgumentException("at least one question is required");
        }

        Quiz quiz = new Quiz();
        quiz.setWorkspace(workspace);
        quiz.setCourseCode(trimToNull(request.courseCode()));
        quiz.setCourseTitle(trimToNull(request.courseTitle()));
        quiz.setTitle(request.title().trim());
        quiz.setDifficulty(normalizeDifficulty(request.difficulty()));
        quiz.setTimeMinutes(request.timeMinutes() != null ? request.timeMinutes() : 0);
        quiz.setTotalQuestions(request.questions().size());
        Quiz saved = quizRepository.save(quiz);

        saveQuestions(saved, request.questions());
        return toResponse(quizRepository.save(saved), null);
    }

    @Override
    public QuizResponse update(UUID quizId, QuizUpdateRequest changes) {
        Quiz quiz = findQuiz(quizId);

        if (changes.courseCode() != null) {
            quiz.setCourseCode(trimToNull(changes.courseCode()));
        }
        if (changes.courseTitle() != null) {
            quiz.setCourseTitle(trimToNull(changes.courseTitle()));
        }
        if (changes.title() != null && !changes.title().isBlank()) {
            quiz.setTitle(changes.title().trim());
        }
        if (changes.difficulty() != null && !changes.difficulty().isBlank()) {
            quiz.setDifficulty(normalizeDifficulty(changes.difficulty()));
        }
        if (changes.timeMinutes() != null) {
            quiz.setTimeMinutes(changes.timeMinutes());
        }
        if (changes.archived() != null) {
            quiz.setArchived(changes.archived());
        }

        return toResponse(quizRepository.save(quiz), null);
    }

    @Override
    public void delete(UUID quizId) {
        Quiz quiz = findQuiz(quizId);
        // Xoá con trước để không vi phạm khoá ngoại.
        attemptRepository.deleteByQuizId(quiz.getId());
        questionRepository.deleteByQuizId(quiz.getId());
        quizRepository.delete(quiz);
    }

    @Override
    public QuizResponse startAttempt(UUID quizId, UUID userId) {
        Quiz quiz = findQuiz(quizId);
        User user = requireUser(userId);

        // Đã có lượt đang mở thì dùng lại, tránh tạo rác mỗi lần bấm Start.
        QuizAttempt attempt = attemptRepository
                .findFirstByQuizIdAndUserIdAndSubmittedAtIsNullOrderByStartedAtDesc(quizId, user.getId())
                .orElseGet(() -> {
                    QuizAttempt created = new QuizAttempt();
                    created.setQuiz(quiz);
                    created.setUser(user);
                    created.setQuestionCount(quiz.getTotalQuestions());
                    return attemptRepository.save(created);
                });

        return toResponse(quiz, user.getId());
    }

    @Override
    public QuizResponse submitAttempt(UUID quizId, UUID userId, QuizAttemptRequest request) {
        Quiz quiz = findQuiz(quizId);
        User user = requireUser(userId);

        QuizAttempt attempt = attemptRepository
                .findFirstByQuizIdAndUserIdAndSubmittedAtIsNullOrderByStartedAtDesc(quizId, user.getId())
                .orElseGet(() -> {
                    // Nộp thẳng mà chưa bấm Start: vẫn ghi nhận một lượt hoàn chỉnh.
                    QuizAttempt created = new QuizAttempt();
                    created.setQuiz(quiz);
                    created.setUser(user);
                    return created;
                });

        int totalQuestions = request != null && request.questionCount() != null && request.questionCount() > 0
                ? request.questionCount()
                : (quiz.getTotalQuestions() > 0 ? quiz.getTotalQuestions() : 1);
        int correct = request != null && request.correctCount() != null ? request.correctCount() : 0;

        attempt.setQuestionCount(totalQuestions);
        attempt.setCorrectCount(Math.min(Math.max(correct, 0), totalQuestions));
        attempt.setSubmittedAt(Instant.now());
        attemptRepository.save(attempt);

        return toResponse(quiz, user.getId());
    }

    // ---------------------------------------------------------------- helpers
    private void saveQuestions(Quiz quiz, List<QuizCreateRequest.QuestionPayload> payloads) {
        List<QuizQuestion> questions = new ArrayList<>();
        int position = 0;
        for (QuizCreateRequest.QuestionPayload payload : payloads) {
            if (payload == null || payload.prompt() == null || payload.prompt().isBlank()) {
                continue;
            }
            List<String> options = payload.options() == null ? List.of() : payload.options();
            if (options.size() < 2) {
                throw new IllegalArgumentException("each question needs at least 2 options");
            }
            int correct = payload.correctIndex();
            if (correct < 0 || correct >= options.size()) {
                throw new IllegalArgumentException("correctIndex is out of range for question: " + payload.prompt());
            }

            QuizQuestion question = new QuizQuestion();
            question.setQuiz(quiz);
            question.setPosition(position++);
            question.setPrompt(payload.prompt().trim());
            question.setOptionList(options);
            question.setCorrectIndex(correct);
            question.setExplanation(trimToNull(payload.explanation()));
            question.setRagSource(trimToNull(payload.ragSource()));
            questions.add(question);
        }
        if (questions.isEmpty()) {
            throw new IllegalArgumentException("at least one valid question is required");
        }
        questionRepository.saveAll(questions);
        quiz.setTotalQuestions(questions.size());
    }

    private List<Quiz> resolveQuizzes(UUID ownerId, UUID workspaceId) {
        if (workspaceId != null) {
            return quizRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        }
        UUID resolved = resolveWorkspaceId(ownerId, null);
        return resolved == null ? List.of() : quizRepository.findByWorkspaceIdOrderByCreatedAtDesc(resolved);
    }

    private QuizResponse toResponse(Quiz quiz, UUID userId) {
        List<QuizAttempt> attempts = userId == null
                ? attemptRepository.findByQuizIdOrderByStartedAtDesc(quiz.getId())
                : attemptRepository.findByQuizIdOrderByStartedAtDesc(quiz.getId()).stream()
                        .filter(attempt -> attempt.getUser() != null
                                && attempt.getUser().getId().equals(userId))
                        .toList();

        boolean hasOpenAttempt = attempts.stream().anyMatch(attempt -> !attempt.isSubmitted());
        List<QuizAttempt> submitted = attempts.stream()
                .filter(QuizAttempt::isSubmitted)
                .sorted(Comparator.comparing(QuizAttempt::getSubmittedAt).reversed())
                .toList();

        String status;
        if (hasOpenAttempt) {
            status = STATUS_IN_PROGRESS;
        } else if (!submitted.isEmpty()) {
            status = STATUS_COMPLETED;
        } else {
            status = STATUS_NEW;
        }

        QuizAttempt best = submitted.stream()
                .max(Comparator.comparingInt(QuizAttempt::scorePercent))
                .orElse(null);
        Integer scorePercent = best != null ? best.scorePercent() : null;
        String score = scorePercent != null ? scorePercent + "%" : null;

        String lastAttempt = submitted.isEmpty() ? "Never" : relative(submitted.get(0).getSubmittedAt());

        List<QuizQuestion> questions = questionRepository.findByQuizIdOrderByPositionAsc(quiz.getId());
        QuizResponse.SampleQuestion sample = questions.isEmpty() ? null : toSample(questions.get(0));

        return new QuizResponse(
                quiz.getId(),
                quiz.getWorkspace() != null ? quiz.getWorkspace().getId() : null,
                quiz.getCourseCode(),
                quiz.getCourseTitle(),
                quiz.getTitle(),
                quiz.getDifficulty(),
                quiz.getTotalQuestions(),
                quiz.getTimeMinutes(),
                status,
                score,
                scorePercent,
                lastAttempt,
                submitted.size(),
                sample);
    }

    private QuizResponse.SampleQuestion toSample(QuizQuestion question) {
        return new QuizResponse.SampleQuestion(
                question.getId(),
                question.getPrompt(),
                question.optionList(),
                question.getCorrectIndex(),
                question.getExplanation(),
                question.getRagSource());
    }

    private boolean matches(Quiz quiz, String keyword) {
        if (keyword.isEmpty()) {
            return true;
        }
        return contains(quiz.getTitle(), keyword)
                || contains(quiz.getCourseCode(), keyword)
                || contains(quiz.getCourseTitle(), keyword);
    }

    private boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return switch (status.trim().toUpperCase(Locale.ROOT)) {
            case STATUS_NEW ->
                STATUS_NEW;
            case STATUS_IN_PROGRESS, "IN-PROGRESS", "INPROGRESS" ->
                STATUS_IN_PROGRESS;
            case STATUS_COMPLETED ->
                STATUS_COMPLETED;
            default ->
                null;
        };
    }

    private String normalizeDifficulty(String value) {
        if (value == null || value.isBlank()) {
            return "medium";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "easy", "medium", "hard" ->
                normalized;
            default ->
                "medium";
        };
    }

    /**
     * "Today" / "2 days ago" / "1 week ago" — khớp cách UI đang hiển thị.
     */
    private String relative(Instant instant) {
        if (instant == null) {
            return "Never";
        }
        long minutes = Duration.between(instant, Instant.now()).toMinutes();
        if (minutes < 1) {
            return "Today";
        }
        if (minutes < 60) {
            return minutes + " minutes ago";
        }
        long hours = minutes / 60;
        if (hours < 24) {
            return hours == 1 ? "1 hour ago" : hours + " hours ago";
        }
        long days = hours / 24;
        if (days == 1) {
            return "Today";
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

    private Workspace resolveWorkspace(UUID ownerId, UUID workspaceId) {
        if (workspaceId != null) {
            return workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + workspaceId));
        }
        if (ownerId == null) {
            throw new IllegalArgumentException("ownerId is required");
        }
        List<Workspace> owned = workspaceRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        if (!owned.isEmpty()) {
            return owned.get(0);
        }
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + ownerId));
        Workspace workspace = new Workspace();
        workspace.setName("Academy");
        workspace.setDescription("Study workspace for the Academy Hub");
        workspace.setOwner(owner);
        return workspaceRepository.save(workspace);
    }

    private Quiz findQuiz(UUID quizId) {
        if (quizId == null) {
            throw new IllegalArgumentException("quizId is required");
        }
        return quizRepository.findById(quizId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Quiz not found: " + quizId));
    }

    private User requireUser(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + userId));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
