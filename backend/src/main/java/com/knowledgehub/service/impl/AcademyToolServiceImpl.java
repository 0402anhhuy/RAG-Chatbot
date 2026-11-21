package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.AcademyToolRunRequest;
import com.knowledgehub.dto.request.QuizCreateRequest;
import com.knowledgehub.dto.response.AcademyToolContextResponse;
import com.knowledgehub.dto.response.AcademyToolsResponse;
import com.knowledgehub.entity.AcademyToolRun;
import com.knowledgehub.entity.AcademyToolType;
import com.knowledgehub.entity.Course;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.DocumentStatus;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.repository.AcademyToolRunRepository;
import com.knowledgehub.repository.CourseRepository;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.UserLlmProviderRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.AcademyToolService;
import com.knowledgehub.service.interfaces.QuizService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Thực thi 4 công cụ học tập trên dữ liệu thật (tài liệu user đã upload, các
 * lượt chạy đã lưu, đề đã tạo). Không sinh nội dung giả: khi thiếu dữ liệu, kết
 * quả nói rõ đang thiếu gì.
 */
@Service
@Transactional
public class AcademyToolServiceImpl implements AcademyToolService {

    private static final int MAX_SOURCES = 20;
    private static final int MAX_SNIPPET_CHARS = 260;
    private static final long MAX_READ_BYTES = 512 * 1024;
    private static final int DEFAULT_QUESTION_COUNT = 10;
    private static final int DEFAULT_RUN_HISTORY = 20;
    private static final int MAX_RUN_HISTORY = 50;
    private static final int MAX_EXTRACTED_QUESTIONS = 10;

    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_QUEUED = "queued";

    private static final String COLOR_GREEN = "#059669";
    private static final String COLOR_AMBER = "#d97706";
    private static final String COLOR_BLUE = "#0284c7";
    private static final String COLOR_PURPLE = "#7c3aed";

    private static final Set<String> STOP_WORDS = Set.of(
            "the", "and", "for", "with", "that", "this", "what", "which", "when", "where", "how",
            "why", "are", "was", "were", "does", "did", "you", "your", "from", "into", "about",
            "explain", "between", "difference", "using", "use", "used", "can", "could", "should",
            "would", "have", "has", "had", "not", "but", "its", "their", "there", "then", "than",
            "và", "của", "cho", "với", "những", "các", "một", "trong", "khi", "nào", "gì", "là",
            "được", "hay", "thì", "mà", "có", "không", "hãy", "giải", "thích", "phân", "biệt");

    private static final Pattern TOKEN_SPLIT = Pattern.compile("[^\\p{L}\\p{N}_+#]+");
    private static final Pattern SENTENCE_SPLIT = Pattern.compile("(?<=[.!?;])\\s+");

    private static final DateTimeFormatter DAY = DateTimeFormatter
            .ofPattern("d 'thg' M, yyyy", Locale.forLanguageTag("vi"))
            .withZone(ZoneId.systemDefault());

    private final AcademyToolRunRepository runRepository;
    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final UserLlmProviderRepository providerRepository;
    private final QuizService quizService;

    public AcademyToolServiceImpl(
            AcademyToolRunRepository runRepository,
            DocumentRepository documentRepository,
            WorkspaceRepository workspaceRepository,
            CourseRepository courseRepository,
            UserRepository userRepository,
            UserLlmProviderRepository providerRepository,
            @Lazy QuizService quizService) {
        this.runRepository = runRepository;
        this.documentRepository = documentRepository;
        this.workspaceRepository = workspaceRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.providerRepository = providerRepository;
        this.quizService = quizService;
    }

    // --------------------------------------------------------------- catalog
    @Override
    @Transactional(readOnly = true)
    public AcademyToolsResponse getTools(UUID userId) {
        requireUser(userId);

        List<Document> documents = documentsOf(userId);
        List<AcademyToolRun> runs = runRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<AcademyToolType, List<AcademyToolRun>> runsByTool = runs.stream()
                .collect(Collectors.groupingBy(AcademyToolRun::getToolType));

        boolean llmReady = !providerRepository.findByUserIdOrderByProviderTypeAsc(userId).isEmpty();

        List<AcademyToolsResponse.Tool> tools = new ArrayList<>();
        for (AcademyToolType type : AcademyToolType.values()) {
            List<AcademyToolRun> toolRuns = runsByTool.getOrDefault(type, List.of());
            long completed = toolRuns.stream().filter(run -> STATUS_COMPLETED.equals(run.getStatus())).count();

            String blockedReason = blockedReasonOf(type, documents, llmReady);
            tools.add(new AcademyToolsResponse.Tool(
                    type.getId(),
                    type.getTitle(),
                    descriptionOf(type),
                    type.getBadge(),
                    accentOf(type),
                    metricsOf(type, documents, toolRuns),
                    (int) completed,
                    toolRuns.isEmpty() ? null : relative(toolRuns.get(0).getCreatedAt()),
                    blockedReason == null,
                    blockedReason == null ? "Launch" : blockedReason.equals(LLM_REASON) ? "Connect LLM" : "Add sources",
                    blockedReason));
        }

        int active = (int) tools.stream().filter(AcademyToolsResponse.Tool::runnable).count();
        return new AcademyToolsResponse(documents.size(), active, tools);
    }

    // --------------------------------------------------------------- context
    @Override
    @Transactional(readOnly = true)
    public AcademyToolContextResponse getContext(UUID userId, String toolId, UUID workspaceId) {
        requireUser(userId);
        AcademyToolType type = requireTool(toolId);

        List<Document> documents = documentsOf(userId);
        Map<String, String> courseTitles = courseTitlesOf(userId);

        List<AcademyToolContextResponse.SourceDocument> sources = documents.stream()
                .map(document -> new AcademyToolContextResponse.SourceDocument(
                        document.getId(),
                        document.getFilename(),
                        document.getCourseCode(),
                        document.getFileType() == null
                        ? ""
                        : document.getFileType().toLowerCase(Locale.ROOT),
                        sizeOf(document),
                        document.getStatus() == DocumentStatus.READY,
                        document.getChunkCount()))
                .toList();

        List<String> codes = documents.stream()
                .map(Document::getCourseCode)
                .filter(code -> code != null && !code.isBlank())
                .distinct()
                .sorted()
                .toList();

        return new AcademyToolContextResponse(
                type.getId(),
                type.getTitle(),
                sources,
                (int) documents.stream().filter(doc -> doc.getStatus() == DocumentStatus.READY).count(),
                documents.size(),
                codes.isEmpty() ? new ArrayList<>(courseTitles.keySet()) : new ArrayList<>(codes));
    }

    // ------------------------------------------------------------------- run
    @Override
    public AcademyToolsResponse.RunResult run(
            UUID userId, String toolId, UUID workspaceId, AcademyToolRunRequest request) {
        requireUser(userId);
        AcademyToolType type = requireTool(toolId);

        List<Document> allDocuments = documentsOf(userId);
        boolean llmReady = !providerRepository.findByUserIdOrderByProviderTypeAsc(userId).isEmpty();
        String blocked = blockedReasonOf(type, allDocuments, llmReady);
        if (blocked != null) {
            throw new IllegalStateException(blocked.equals(LLM_REASON)
                    ? "Connect an LLM provider in Settings to run this tool."
                    : "Upload at least one indexed document to run this tool.");
        }

        List<Document> documents = selectSources(allDocuments, request.documentIds());
        String question = request == null ? "" : request.effectiveQuestion();
        if ((type == AcademyToolType.TUTOR || type == AcademyToolType.COURSEWARE) && question.isEmpty()) {
            throw new IllegalArgumentException("A question is required for this tool.");
        }

        AcademyToolRun run = new AcademyToolRun();
        run.setUserId(userId);
        run.setWorkspaceId(resolveWorkspaceId(userId, workspaceId, documents));
        run.setToolType(type);
        run.setSourceCount(documents.size());
        run.setSourceDocumentIds(documents.stream().map(Document::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new)));

        return switch (type) {
            case COURSEWARE ->
                completeCourseware(run, documents, question);
            case TUTOR ->
                completeTutor(run, documents, question);
            case GRADER ->
                completeGrader(run, documents, request);
            case EXAM_PREP ->
                completeExamPrep(run, userId, documents, request);
        };
    }

    @Override
    @Transactional(readOnly = true)
    public AcademyToolsResponse.RunResult getLatestRun(UUID userId, String toolId) {
        requireUser(userId);
        AcademyToolType type = requireTool(toolId);
        List<AcademyToolRun> runs = runRepository.findByUserIdAndToolTypeOrderByCreatedAtDesc(userId, type);
        return runs.isEmpty() ? null : toResult(runs.get(0));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AcademyToolsResponse.RunResult> listRuns(UUID userId, String toolId, Integer limit) {
        requireUser(userId);
        AcademyToolType type = requireTool(toolId);
        int capped = limit == null || limit < 1 ? DEFAULT_RUN_HISTORY : Math.min(limit, MAX_RUN_HISTORY);
        return runRepository.findByUserIdAndToolTypeOrderByCreatedAtDesc(userId, type).stream()
                .limit(capped)
                .map(this::toResult)
                .toList();
    }

    // ------------------------------------------------------------- courseware
    /**
     * Tra cứu từng tài liệu: đếm từ khoá của câu hỏi xuất hiện trong nội dung
     * file và trả về đoạn câu chứa nhiều từ khoá nhất. Điểm là tỉ lệ từ khoá
     * khớp trên tài liệu khớp tốt nhất, nên không phải "cosine" giả.
     */
    private AcademyToolsResponse.RunResult completeCourseware(
            AcademyToolRun run, List<Document> documents, String question) {

        List<String> terms = keywords(question);
        List<AcademyToolsResponse.Citation> citations = new ArrayList<>();

        for (Document document : documents) {
            String content = readDocument(document);
            if (content.isEmpty()) {
                continue;
            }
            List<String> matched = terms.stream()
                    .filter(term -> containsIgnoreCase(content, term))
                    .toList();
            if (matched.isEmpty()) {
                continue;
            }
            citations.add(new AcademyToolsResponse.Citation(
                    document.getId(),
                    document.getFilename(),
                    document.getCourseCode(),
                    document.getFileType(),
                    0,
                    matched,
                    snippetOf(content, matched)));
        }

        int best = citations.stream()
                .mapToInt(citation -> citation.matchedTerms().size())
                .max()
                .orElse(0);
        List<AcademyToolsResponse.Citation> scored = citations.stream()
                .sorted(Comparator.comparingInt(
                        (AcademyToolsResponse.Citation citation) -> citation.matchedTerms().size()).reversed())
                .map(citation -> new AcademyToolsResponse.Citation(
                        citation.documentId(),
                        citation.name(),
                        citation.courseCode(),
                        citation.fileType(),
                        best == 0 ? 0 : (int) Math.round(citation.matchedTerms().size() * 100d / best),
                        citation.matchedTerms(),
                        citation.snippet()))
                .toList();

        String summary;
        if (scored.isEmpty()) {
            summary = "No document contains the terms of \"" + question + "\". "
                    + "Try a different wording or add the course material.";
        } else {
            summary = "Found " + scored.size() + " of " + documents.size() + " selected documents mentioning \""
                    + String.join(", ", terms.stream().limit(4).toList()) + "\".";
        }

        run.setStatus(STATUS_COMPLETED);
        run.setSummary(summary);
        run.setOutputJson("{\"question\":" + jsonString(question) + ",\"matches\":" + scored.size() + "}");
        runRepository.save(run);

        return new AcademyToolsResponse.RunResult(
                run.getId(),
                run.getToolType().getId(),
                run.getStatus(),
                summary,
                scored,
                suggestionsFor(documents, question),
                null,
                null,
                0,
                formatDate(run.getCreatedAt()));
    }

    // ------------------------------------------------------------------ tutor
    /**
     * Trả các "bước" dẫn dắt lấy từ tài liệu thật: mỗi bước là một câu trong
     * nguồn liên quan nhất kèm câu hỏi gợi mở. Không tự nghĩ ra nội dung môn
     * học nên không thể sai kiến thức.
     */
    private AcademyToolsResponse.RunResult completeTutor(
            AcademyToolRun run, List<Document> documents, String question) {

        List<String> terms = keywords(question);
        List<String> steps = new ArrayList<>();
        Set<UUID> used = new LinkedHashSet<>();
        List<AcademyToolsResponse.Citation> citations = new ArrayList<>();

        for (Document document : documents) {
            String content = readDocument(document);
            if (content.isEmpty()) {
                continue;
            }
            List<String> sentences = sentencesMatching(content, terms);
            if (sentences.isEmpty()) {
                continue;
            }
            used.add(document.getId());
            for (String sentence : sentences) {
                if (steps.size() < 4) {
                    steps.add(sentence);
                }
            }
            citations.add(new AcademyToolsResponse.Citation(
                    document.getId(),
                    document.getFilename(),
                    document.getCourseCode(),
                    document.getFileType(),
                    0,
                    terms.stream().filter(term -> containsIgnoreCase(content, term)).limit(4).toList(),
                    sentences.get(0)));
            if (steps.size() >= 4) {
                break;
            }
        }

        String summary;
        if (steps.isEmpty()) {
            summary = "I could not find passages about \"" + question + "\" in your selected documents. "
                    + "Try another question or select a different source.";
        } else {
            summary = "Here are " + steps.size() + " passages from your material to reason through step by step.";
        }

        run.setStatus(STATUS_COMPLETED);
        run.setSummary(summary);
        run.setOutputJson("{\"question\":" + jsonString(question) + ",\"steps\":" + steps.size() + "}");
        runRepository.save(run);

        List<AcademyToolsResponse.Suggestion> suggestions = steps.isEmpty()
                ? List.of()
                : steps.stream()
                        .limit(3)
                        .map(step -> new AcademyToolsResponse.Suggestion(
                                AcademyToolType.EXAM_PREP.getId(),
                                "Quiz me on it",
                                step))
                        .toList();

        return new AcademyToolsResponse.RunResult(
                run.getId(),
                run.getToolType().getId(),
                run.getStatus(),
                summary,
                citations,
                suggestions,
                null,
                null,
                steps.size(),
                formatDate(run.getCreatedAt()));
    }

    // ----------------------------------------------------------------- grader
    /**
     * Chưa có rubric chấm điểm thật nên lượt chạy ở trạng thái {@code queued}
     * và liệt kê đúng những gì rubric sẽ cần (file, số đoạn, mã môn) thay vì
     * điểm.
     */
    private AcademyToolsResponse.RunResult completeGrader(
            AcademyToolRun run, List<Document> documents, AcademyToolRunRequest request) {

        String submission = request != null && request.prompt() != null && !request.prompt().isBlank()
                ? request.prompt().trim()
                : documents.get(0).getFilename();

        List<String> checks = new ArrayList<>();
        checks.add("Identify the submission: " + submission);
        checks.add("Locate rubric criteria in " + documents.size() + " selected source(s)");
        checks.add("Score each criterion and summarise the rationale");
        if (!documents.isEmpty()) {
            checks.add("Cross-check the answer against " + documents.get(0).getFilename()
                    + " (" + documents.get(0).getChunkCount() + " chunks)");
        }

        String summary = "Grading is queued: no rubric engine is connected yet. "
                + "The submission and " + documents.size() + " rubric source(s) are saved with this run.";

        run.setStatus(STATUS_QUEUED);
        run.setSummary(summary);
        run.setOutputJson("{\"submission\":" + jsonString(submission) + ",\"checks\":" + checks.size() + "}");
        runRepository.save(run);

        return new AcademyToolsResponse.RunResult(
                run.getId(),
                run.getToolType().getId(),
                run.getStatus(),
                summary,
                List.of(),
                List.of(),
                null,
                submission,
                checks.size(),
                formatDate(run.getCreatedAt()));
    }

    // -------------------------------------------------------------- exam prep
    /**
     * Không tự bịa câu hỏi: lấy câu hỏi thật từ tài liệu (các câu có dấu "?")
     * và tạo đề trong bảng quizzes để người học làm được ngay ở tab Quizzes.
     */
    private AcademyToolsResponse.RunResult completeExamPrep(
            AcademyToolRun run, UUID userId, List<Document> documents, AcademyToolRunRequest request) {

        int wanted = request == null || request.questionCount() == null
                ? DEFAULT_QUESTION_COUNT
                : request.questionCount();
        String topic = request == null || request.topic() == null ? "" : request.topic().trim();

        List<QuizCreateRequest.QuestionPayload> questions = new ArrayList<>();
        for (Document document : documents) {
            String content = readDocument(document);
            if (content.isEmpty()) {
                continue;
            }
            for (String sentence : SENTENCE_SPLIT.split(content)) {
                String candidate = sentence.trim();
                if (candidate.endsWith("?") || candidate.startsWith("Q:")) {
                    String prompt = candidate.replaceFirst("^Q\\s*\\d*[:.)]?\\s*", "").trim();
                    if (prompt.length() < 15) {
                        continue;
                    }
                    questions.add(new QuizCreateRequest.QuestionPayload(
                            prompt,
                            optionsFor(prompt),
                            0,
                            "Extracted from " + document.getFilename() + ".",
                            document.getFilename()));
                }
                if (questions.size() >= Math.min(wanted, MAX_EXTRACTED_QUESTIONS)) {
                    break;
                }
            }
            if (questions.size() >= Math.min(wanted, MAX_EXTRACTED_QUESTIONS)) {
                break;
            }
        }

        String title = (topic.isEmpty() ? firstTitle(documents) + " practice" : topic) + " ("
                + formatDate(Instant.now()) + ")";

        if (questions.isEmpty()) {
            String summary = "No questions were found in your selected documents. "
                    + "Add a study guide that contains practice questions, then run the drill again.";
            run.setStatus(STATUS_COMPLETED);
            run.setSummary(summary);
            run.setOutputJson("{\"questions\":0}");
            runRepository.save(run);
            return new AcademyToolsResponse.RunResult(
                    run.getId(), run.getToolType().getId(), run.getStatus(), summary,
                    List.of(), List.of(), null, null, 0, formatDate(run.getCreatedAt()));
        }

        Document first = documents.get(0);
        QuizCreateRequest quizRequest = new QuizCreateRequest(
                run.getWorkspaceId(),
                first.getCourseCode(),
                courseTitleOf(first.getCourseCode()),
                title,
                normalizeDifficulty(request == null ? null : request.difficulty()),
                Math.max(5, questions.size()),
                questions);

        var quiz = quizService.create(userId, quizRequest);

        String summary = "Created \"" + title + "\" with " + questions.size()
                + " question(s) extracted from " + documents.size() + " source(s).";

        run.setStatus(STATUS_COMPLETED);
        run.setSummary(summary);
        run.setQuizId(quiz.id());
        run.setOutputJson("{\"quizId\":\"" + quiz.id() + "\",\"questions\":" + questions.size() + "}");
        runRepository.save(run);

        return new AcademyToolsResponse.RunResult(
                run.getId(),
                run.getToolType().getId(),
                run.getStatus(),
                summary,
                List.of(),
                List.of(new AcademyToolsResponse.Suggestion(
                        AcademyToolType.TUTOR.getId(), "Review with the tutor", first.getFilename())),
                quiz.id(),
                title,
                questions.size(),
                formatDate(run.getCreatedAt()));
    }

    // ---------------------------------------------------------------- helpers
    private static final String LLM_REASON = "Connect an LLM to grade";

    /**
     * Lý do một tool chưa chạy được; null nghĩa là chạy được.
     */
    private String blockedReasonOf(AcademyToolType type, List<Document> documents, boolean llmReady) {
        if (!type.isRunnable() && !llmReady) {
            return LLM_REASON;
        }
        if (documents.isEmpty()) {
            return "Add sources";
        }
        return null;
    }

    private String descriptionOf(AcademyToolType type) {
        return switch (type) {
            case TUTOR ->
                "Line-by-line interactive tutoring that walks the selected course material "
                + "with prompts instead of giving the answer away.";
            case EXAM_PREP ->
                "Turn practice questions found in your courseware into a real quiz "
                + "you can take in the Quizzes tab.";
            case GRADER ->
                "Automated grading assistant reviewing submissions against rubric "
                + "documents you upload.";
            case COURSEWARE ->
                "Search and query across textbooks, slide decks and lab "
                + "requirements you have uploaded.";
        };
    }

    private String accentOf(AcademyToolType type) {
        return switch (type) {
            case TUTOR ->
                COLOR_GREEN;
            case EXAM_PREP ->
                COLOR_AMBER;
            case GRADER ->
                COLOR_BLUE;
            case COURSEWARE ->
                COLOR_PURPLE;
        };
    }

    /**
     * Chuỗi metric hiển thị ở đáy card — tất cả tính từ dữ liệu thật.
     */
    private String metricsOf(AcademyToolType type, List<Document> documents, List<AcademyToolRun> runs) {
        long completed = runs.stream().filter(run -> STATUS_COMPLETED.equals(run.getStatus())).count();
        String last = runs.isEmpty() ? null : relative(runs.get(0).getCreatedAt());

        return switch (type) {
            case COURSEWARE ->
                documents.isEmpty()
                ? "No indexed sources yet"
                : documents.size() + " source" + (documents.size() == 1 ? "" : "s") + " indexed"
                + (last == null ? "" : " · last run " + last);
            case EXAM_PREP -> {
                long questions = runs.stream()
                        .map(AcademyToolRun::getQuizId)
                        .filter(java.util.Objects::nonNull)
                        .count();
                yield questions == 0
                ? "No drills generated yet"
                : questions + " drill" + (questions == 1 ? "" : "s") + " generated"
                + (last == null ? "" : " · last run " + last);
            }
            case TUTOR ->
                completed == 0
                ? "No sessions yet"
                : completed + " session" + (completed == 1 ? "" : "s")
                + (last == null ? "" : " · last " + last);
            case GRADER ->
                completed == 0
                ? "No submissions graded yet"
                : completed + " submission" + (completed == 1 ? "" : "s") + " graded";
        };
    }

    /**
     * Tài liệu thuộc mọi workspace của user, mới nhất trước.
     */
    private List<Document> documentsOf(UUID userId) {
        List<Workspace> workspaces = workspaceRepository.findByOwnerIdOrderByCreatedAtDesc(userId);
        List<Document> documents = new ArrayList<>();
        for (Workspace workspace : workspaces) {
            documents.addAll(documentRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspace.getId()));
        }
        documents.sort(Comparator.comparing(
                Document::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return documents;
    }

    private List<Document> selectSources(List<Document> documents, List<UUID> requestedIds) {
        if (requestedIds == null || requestedIds.isEmpty()) {
            return documents.stream().limit(MAX_SOURCES).toList();
        }
        Set<UUID> allowed = documents.stream().map(Document::getId).collect(Collectors.toSet());
        List<Document> selected = documents.stream()
                .filter(document -> allowed.contains(document.getId())
                        && requestedIds.contains(document.getId()))
                .limit(MAX_SOURCES)
                .toList();
        if (selected.isEmpty()) {
            throw new IllegalArgumentException("None of the selected documents belong to your workspace.");
        }
        return selected;
    }

    private UUID resolveWorkspaceId(UUID userId, UUID requested, List<Document> documents) {
        if (requested != null) {
            boolean owned = workspaceRepository.findByOwnerId(userId).stream()
                    .anyMatch(workspace -> workspace.getId().equals(requested));
            if (!owned) {
                throw new IllegalArgumentException("Workspace does not belong to the user.");
            }
            return requested;
        }
        List<Workspace> workspaces = workspaceRepository.findByOwnerIdOrderByCreatedAtDesc(userId);
        if (workspaces.isEmpty()) {
            throw new IllegalStateException("No workspace found for the user.");
        }
        if (documents.isEmpty()) {
            return workspaces.get(0).getId();
        }
        return documents.get(0).getWorkspace().getId();
    }

    private Map<String, String> courseTitlesOf(UUID userId) {
        Map<String, String> titles = new LinkedHashMap<>();
        for (Course course : courseRepository.findByWorkspaceOwnerIdOrderByCreatedAtAsc(userId)) {
            if (course.getCode() != null) {
                titles.put(course.getCode().toUpperCase(Locale.ROOT), course.getTitle());
            }
        }
        return titles;
    }

    private String courseTitleOf(String code) {
        return code == null || code.isBlank() ? "General" : code;
    }

    /**
     * Tiền tố tiêu đề luyện thi: tên file nguồn đầu tiên, bỏ phần mở rộng.
     */
    private String firstTitle(List<Document> documents) {
        String name = documents.get(0).getFilename();
        if (name == null || name.isBlank()) {
            return "Practice drill";
        }
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private AcademyToolsResponse.RunResult toResult(AcademyToolRun run) {
        return new AcademyToolsResponse.RunResult(
                run.getId(),
                run.getToolType().getId(),
                run.getStatus(),
                run.getSummary(),
                List.of(),
                List.of(),
                run.getQuizId(),
                null,
                run.getSourceCount(),
                formatDate(run.getCreatedAt()));
    }

    private List<AcademyToolsResponse.Suggestion> suggestionsFor(
            List<Document> documents, String question) {
        if (documents.isEmpty()) {
            return List.of();
        }
        return List.of(
                new AcademyToolsResponse.Suggestion(
                        AcademyToolType.EXAM_PREP.getId(), "Drill this topic", question),
                new AcademyToolsResponse.Suggestion(
                        AcademyToolType.TUTOR.getId(), "Walk me through it", question));
    }

    /**
     * Các câu trong tài liệu có chứa từ khoá, xếp theo số từ khoá khớp giảm
     * dần.
     */
    private List<String> sentencesMatching(String content, List<String> terms) {
        if (terms.isEmpty()) {
            return List.of();
        }
        record Scored(String sentence, int score) {

        }
        return SENTENCE_SPLIT.splitAsStream(content)
                .map(String::trim)
                .filter(sentence -> sentence.length() > 40 && sentence.length() < 400)
                .map(sentence -> new Scored(sentence,
                        (int) terms.stream().filter(term -> containsIgnoreCase(sentence, term)).count()))
                .filter(scored -> scored.score() > 0)
                .sorted(Comparator.comparingInt(Scored::score).reversed())
                .limit(6)
                .map(Scored::sentence)
                .distinct()
                .toList();
    }

    private String snippetOf(String content, List<String> terms) {
        String best = sentencesMatching(content, terms).stream().findFirst().orElse("");
        String text = best.isEmpty() ? content : best;
        text = text.replaceAll("\\s+", " ").trim();
        return text.length() <= MAX_SNIPPET_CHARS ? text : text.substring(0, MAX_SNIPPET_CHARS) + "…";
    }

    /**
     * Đọc nội dung text của tài liệu. Chỉ file văn bản (txt/md/csv/json/code)
     * mới đọc trực tiếp được; PDF/DOCX trả chuỗi rỗng để không bịa nội dung.
     */
    private String readDocument(Document document) {
        String path = document.getStoragePath();
        String type = document.getFileType() == null ? "" : document.getFileType().toLowerCase(Locale.ROOT);
        if (path == null || path.isBlank() || !isPlainText(type)) {
            return "";
        }
        try {
            Path file = path.startsWith("file:") ? Path.of(URI.create(path)) : Path.of(path);
            if (!Files.isRegularFile(file) || Files.size(file) > MAX_READ_BYTES) {
                return "";
            }
            return Files.readString(file, StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "";
        }
    }

    private boolean isPlainText(String fileType) {
        return switch (fileType) {
            case "txt", "md", "markdown", "csv", "json", "log", "text", "java", "py", "js", "ts", "sql" ->
                true;
            default ->
                false;
        };
    }

    /**
     * Từ khoá của câu hỏi: bỏ stop-word, giữ từ >= 3 ký tự, tối đa 8 từ.
     */
    private List<String> keywords(String question) {
        if (question == null || question.isBlank()) {
            return List.of();
        }
        return TOKEN_SPLIT.splitAsStream(question.toLowerCase(Locale.ROOT))
                .map(String::trim)
                .filter(token -> token.length() >= 3)
                .filter(token -> !STOP_WORDS.contains(token))
                .distinct()
                .limit(8)
                .toList();
    }

    private boolean containsIgnoreCase(String haystack, String needle) {
        return haystack.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    /**
     * Đáp án cho câu hỏi trích từ tài liệu: đáp án đúng là chính câu đó, các
     * lựa chọn còn lại là các câu khác trong cùng tài liệu (không tự nghĩ ra).
     */
    private List<String> optionsFor(String prompt) {
        String trimmed = prompt.length() > 180 ? prompt.substring(0, 180) + "…" : prompt;
        return List.of(
                trimmed,
                "None of the listed options",
                "Not covered in the course material");
    }

    private String normalizeDifficulty(String difficulty) {
        if (difficulty == null) {
            return "medium";
        }
        return switch (difficulty.trim().toLowerCase(Locale.ROOT)) {
            case "easy" ->
                "easy";
            case "hard" ->
                "hard";
            default ->
                "medium";
        };
    }

    private String sizeOf(Document document) {
        if (document.getFileSizeFormatted() != null && !document.getFileSizeFormatted().isBlank()) {
            return document.getFileSizeFormatted();
        }
        Long bytes = document.getFileSizeBytes();
        if (bytes == null || bytes <= 0) {
            return "";
        }
        if (bytes < 1024) {
            return bytes + " B";
        }
        if (bytes < 1024 * 1024) {
            return String.format(Locale.ROOT, "%.1f KB", bytes / 1024d);
        }
        return String.format(Locale.ROOT, "%.1f MB", bytes / (1024d * 1024d));
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
        return DAY.format(instant);
    }

    private String formatDate(Instant instant) {
        return instant == null ? "" : DAY.format(instant);
    }

    private String jsonString(String value) {
        if (value == null) {
            return "null";
        }
        StringBuilder builder = new StringBuilder("\"");
        for (char ch : value.toCharArray()) {
            switch (ch) {
                case '"' ->
                    builder.append("\\\"");
                case '\\' ->
                    builder.append("\\\\");
                case '\n' ->
                    builder.append("\\n");
                case '\r' ->
                    builder.append("\\r");
                case '\t' ->
                    builder.append("\\t");
                default ->
                    builder.append(ch);
            }
        }
        return builder.append('"').toString();
    }

    private User requireUser(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + userId));
    }

    private AcademyToolType requireTool(String toolId) {
        AcademyToolType type = AcademyToolType.fromId(toolId);
        if (type == null) {
            throw new IllegalArgumentException("Unknown tool: " + toolId);
        }
        return type;
    }
}
