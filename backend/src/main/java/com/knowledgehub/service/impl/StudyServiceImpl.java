package com.knowledgehub.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgehub.dto.request.StudyMessageRequest;
import com.knowledgehub.dto.request.StudyNoteRequest;
import com.knowledgehub.dto.request.StudySourceRequest;
import com.knowledgehub.dto.request.StudyStudioRequest;
import com.knowledgehub.dto.response.StudyWorkspaceResponse;
import com.knowledgehub.entity.ChatMessage;
import com.knowledgehub.entity.ChatSession;
import com.knowledgehub.entity.ChatSessionAttachment;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.DocumentStatus;
import com.knowledgehub.entity.MessageRole;
import com.knowledgehub.entity.StudyNote;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.repository.ChatMessageRepository;
import com.knowledgehub.repository.ChatSessionAttachmentRepository;
import com.knowledgehub.repository.ChatSessionRepository;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.StudyNoteRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.rag.RagServiceClient;
import com.knowledgehub.rag.RagWorkspaceAccess;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.StudyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class StudyServiceImpl implements StudyService {

    private static final String RAG_CITATIONS_PREFIX = "rag-citations:";
    private static final TypeReference<List<Map<String, Object>>> CITATIONS_TYPE = new TypeReference<>() {};
    private static final String DEFAULT_TITLE = "Vocabulary";
    private static final DateTimeFormatter DAY = DateTimeFormatter
            .ofPattern("d 'thg' M, yyyy", Locale.forLanguageTag("vi"));
    private static final DateTimeFormatter TIME = DateTimeFormatter
            .ofPattern("HH:mm")
            .withZone(ZoneId.systemDefault());

    /**
     * Công cụ Studio; `id` khớp activeSubTool của AcademyHub.
     */
    private record Tool(String id, String label, String icon, String color, String prompt) {

    }

    private static final List<Tool> TOOLS = List.of(
            new Tool("summary", "Tổng quan tài liệu", "sparkles", "blue",
                    "Hãy tóm tắt các điểm chính của tài liệu nguồn."),
            new Tool("flashcards", "Thẻ ghi nhớ", "layers", "amber",
                    "Hãy tạo bộ thẻ ghi nhớ (mặt trước / mặt sau) từ các nguồn tài liệu."),
            new Tool("quiz", "Bài kiểm tra", "help-circle", "green",
                    "Hãy tạo bài kiểm tra ngắn kèm đáp án từ các nguồn tài liệu."),
            new Tool("mindmap", "Bản đồ tư duy", "compass", "purple",
                    "Hãy dựng bản đồ tư duy dạng cây cho nội dung chính."),
            new Tool("presentation", "Bản trình bày", "presentation", "rose",
                    "Hãy lập dàn ý bản trình bày theo từng slide."),
            new Tool("datatable", "Bảng dữ liệu", "file-spreadsheet", "teal",
                    "Hãy trích các dữ kiện thành bảng: khái niệm | giải thích | ví dụ."));

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionAttachmentRepository attachmentRepository;
    private final DocumentRepository documentRepository;
    private final StudyNoteRepository noteRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final RagServiceClient ragServiceClient;
    private final RagWorkspaceAccess workspaceAccess;
    private final ObjectMapper objectMapper;

    private record RagResult(String answer, List<Map<String, Object>> citations) {}

    // ------------------------------------------------------------------ read
    /**
     * Không dùng readOnly: lần mở đầu tiên có thể phải tạo conversation, và
     * readOnly sẽ rollback insert đó khiến mỗi lần gọi sinh một session mới.
     */
    @Override
    public StudyWorkspaceResponse getWorkspace(UUID ownerId, UUID workspaceId, UUID sessionId) {
        ChatSession session = resolveSession(ownerId, workspaceId, sessionId, true);
        return toResponse(session);
    }

    // --------------------------------------------------------------- sources
    @Override
    public StudyWorkspaceResponse addSource(UUID ownerId, UUID sessionId, StudySourceRequest request) {
        ChatSession session = findAuthorizedSession(ownerId, sessionId);
        Document document = resolveDocument(session, request);
        workspaceAccess.requireReadAccess(ownerId, session.getWorkspace().getId(), List.of(document.getId()));

        ChatSessionAttachment attachment = attachmentRepository
                .findBySessionIdAndDocumentId(sessionId, document.getId())
                .orElseGet(() -> {
                    ChatSessionAttachment created = new ChatSessionAttachment();
                    created.setSession(session);
                    created.setDocument(document);
                    return created;
                });
        if (request != null && request.checked() != null) {
            attachment.setChecked(request.checked());
        }
        attachmentRepository.save(attachment);

        return toResponse(session);
    }

    @Override
    public StudyWorkspaceResponse removeSource(UUID ownerId, UUID sessionId, UUID attachmentId) {
        ChatSession session = findAuthorizedSession(ownerId, sessionId);
        ChatSessionAttachment attachment = attachmentRepository
                .findByIdAndSessionId(attachmentId, sessionId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Source not found: " + attachmentId));
        attachmentRepository.delete(attachment);
        return toResponse(session);
    }

    @Override
    public StudyWorkspaceResponse setSourceChecked(
            UUID ownerId, UUID sessionId, UUID attachmentId, boolean checked) {
        ChatSession session = findAuthorizedSession(ownerId, sessionId);
        ChatSessionAttachment attachment = attachmentRepository
                .findByIdAndSessionId(attachmentId, sessionId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Source not found: " + attachmentId));
        attachment.setChecked(checked);
        attachmentRepository.save(attachment);
        return toResponse(session);
    }

    @Override
    public StudyWorkspaceResponse setAllSourcesChecked(UUID ownerId, UUID sessionId, boolean checked) {
        ChatSession session = findAuthorizedSession(ownerId, sessionId);
        List<ChatSessionAttachment> attachments = attachmentRepository
                .findBySessionIdOrderByCreatedAtAsc(sessionId);
        attachments.forEach(attachment -> attachment.setChecked(checked));
        attachmentRepository.saveAll(attachments);
        return toResponse(session);
    }

    // -------------------------------------------------------------- messages
    @Override
    public StudyWorkspaceResponse sendMessage(UUID ownerId, UUID sessionId, StudyMessageRequest request) {
        ChatSession session = findAuthorizedSession(ownerId, sessionId);
        String question = request == null || request.message() == null ? "" : request.message().trim();
        if (question.isEmpty()) {
            throw new IllegalArgumentException("message is required");
        }
        if (question.length() > 2000) {
            throw new IllegalArgumentException("message must not exceed 2000 characters");
        }

        List<ChatSessionAttachment> sources = checkedSources(sessionId);
        if (sources.isEmpty()) {
            throw new IllegalArgumentException("Bật ít nhất một nguồn tài liệu trước khi gửi câu hỏi.");
        }
        List<ChatMessage> previousMessages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<Map<String, String>> history = previousMessages
                .stream()
                .skip(Math.max(0, previousMessages.size() - 20L))
                .map(message -> Map.of(
                        "role",
                        message.getRole() == MessageRole.ASSISTANT ? "assistant" : "user",
                        "content",
                        Objects.toString(message.getContent(), "")))
                .toList();

        saveMessage(session, MessageRole.USER, question);
        RagResult result = askRag(session, question, sources, history);
        saveAssistantMessage(session, result);

        return toResponse(session);
    }

    @Override
    public StudyWorkspaceResponse runTool(UUID ownerId, UUID sessionId, StudyStudioRequest request) {
        ChatSession session = findAuthorizedSession(ownerId, sessionId);
        Tool tool = TOOLS.stream()
                .filter(item -> item.id().equalsIgnoreCase(request == null ? "" : request.tool().trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown studio tool: " + (request == null ? "" : request.tool())));

        List<ChatSessionAttachment> selectedSources = checkedSources(sessionId);
        if (selectedSources.isEmpty()) {
            throw new IllegalArgumentException("Bật ít nhất một nguồn tài liệu trước khi chạy công cụ này.");
        }
        if (session.getWorkspace() == null) {
            throw new IllegalArgumentException("Conversation has no workspace for RAG requests");
        }

        saveMessage(session, MessageRole.USER, tool.prompt());
        List<String> documentIds = selectedSources.stream()
                .map(source -> source.getDocument().getId().toString())
                .toList();
        RagResult result = switch (tool.id()) {
            case "flashcards" -> generateStudyItems(
                    ragServiceClient.generateFlashcards(
                            session.getWorkspace().getId().toString(), documentIds, 20),
                    "flashcards",
                    selectedSources);
            case "quiz" -> generateStudyItems(
                    ragServiceClient.generateExam(session.getWorkspace().getId().toString(), documentIds, 20),
                    "questions",
                    selectedSources);
            default -> askRag(session, tool.prompt(), selectedSources, List.of());
        };
        saveAssistantMessage(session, result);
        return toResponse(session);
    }

    // ----------------------------------------------------------------- notes
    @Override
    public StudyWorkspaceResponse addNote(UUID ownerId, UUID sessionId, StudyNoteRequest request) {
        ChatSession session = resolveSession(ownerId, request != null ? request.workspaceId() : null,
                sessionId, false);
        if (request == null || request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("title is required");
        }

        StudyNote note = new StudyNote();
        note.setWorkspace(session.getWorkspace());
        note.setSession(session);
        note.setTitle(request.title().trim());
        note.setContent(request.content());
        noteRepository.save(note);

        return toResponse(session);
    }

    @Override
    public StudyWorkspaceResponse deleteNote(UUID ownerId, UUID sessionId, UUID noteId) {
        ChatSession session = findAuthorizedSession(ownerId, sessionId);
        StudyNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Note not found: " + noteId));
        if (note.getSession() == null || !sessionId.equals(note.getSession().getId())) {
            throw new ServiceEntityNotFoundException("Note not found: " + noteId);
        }
        noteRepository.delete(note);
        return toResponse(session);
    }

    // --------------------------------------------------------------- answers
    // ---------------------------------------------------------------- helpers
    private RagResult askRag(
            ChatSession session,
            String query,
            List<ChatSessionAttachment> sources,
            List<Map<String, String>> history) {
        if (session.getWorkspace() == null) {
            throw new IllegalArgumentException("Conversation has no workspace for RAG requests");
        }
        List<String> documentIds = sources.stream()
                .map(source -> source.getDocument().getId().toString())
                .toList();
        Map<String, Object> response = ragServiceClient.sendMessage(
                session.getId().toString(),
                query,
                session.getWorkspace().getId().toString(),
                documentIds,
                history);
        Map<String, Object> data = objectMap(response.get("data"), "RAG response data");
        String answer = Objects.toString(data.get("answer"), "").trim();
        if (answer.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "RAG service returned an empty answer");
        }
        return new RagResult(answer, citationList(data.get("citations"), "RAG citations"));
    }

    private RagResult generateStudyItems(
            Map<String, Object> response,
            String itemsKey,
            List<ChatSessionAttachment> sources) {
        Map<String, Object> data = objectMap(response.get("data"), "RAG study response data");
        Object rawItems = data.get(itemsKey);
        if (!(rawItems instanceof List<?> items)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "RAG service returned invalid study items");
        }
        Map<String, String> filenamesById = new HashMap<>();
        sources.forEach(source -> filenamesById.put(
                source.getDocument().getId().toString(), source.getDocument().getFilename()));
        List<Map<String, Object>> citations = new ArrayList<>();
        StringBuilder answer = new StringBuilder();
        for (int index = 0; index < items.size(); index++) {
            Map<String, Object> item = objectMap(items.get(index), "RAG study item");
            answer.append(index + 1).append(". ").append(Objects.toString(item.get("question"), "")).append('\n');
            if ("flashcards".equals(itemsKey)) {
                answer.append("   ").append(Objects.toString(item.get("answer"), "")).append('\n');
            } else {
                Map<String, Object> options = objectMap(item.get("options"), "RAG exam options");
                for (String option : List.of("A", "B", "C", "D")) {
                    if (options.containsKey(option)) {
                        answer.append("   ").append(option).append(". ")
                                .append(Objects.toString(options.get(option), "")).append('\n');
                    }
                }
                answer.append("   Đáp án: ").append(Objects.toString(item.get("correct_answer"), "")).append('\n');
            }
            String documentId = Objects.toString(item.get("document_id"), "");
            Map<String, Object> citation = new HashMap<>();
            citation.put("document_id", documentId);
            citation.put("chunk_id", item.get("chunk_id"));
            citation.put("page", item.get("page"));
            citation.put("file_name", filenamesById.getOrDefault(documentId, "Tài liệu nguồn"));
            citations.add(citation);
            answer.append('\n');
        }
        if (items.isEmpty()) {
            answer.append("Không tạo được nội dung từ các nguồn đã chọn.");
        }
        return new RagResult(answer.toString().trim(), citations);
    }

    private Map<String, Object> objectMap(Object value, String fieldName) {
        if (!(value instanceof Map<?, ?> map)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "RAG service returned invalid " + fieldName);
        }
        Map<String, Object> result = new HashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (entry.getKey() instanceof String key) {
                result.put(key, entry.getValue());
            }
        }
        return result;
    }

    private List<Map<String, Object>> citationList(Object value, String fieldName) {
        if (value == null) {
            return List.of();
        }
        if (!(value instanceof List<?> list)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "RAG service returned invalid " + fieldName);
        }
        return list.stream().map(item -> objectMap(item, fieldName)).toList();
    }

    private void saveAssistantMessage(ChatSession session, RagResult result) {
        ChatMessage message = new ChatMessage();
        message.setSession(session);
        message.setRole(MessageRole.ASSISTANT);
        message.setContent(result.answer());
        message.setSources(serializeCitations(result.citations()));
        message.setTokenCount(0L);
        message.setCost(0d);
        chatMessageRepository.save(message);
    }

    private String serializeCitations(List<Map<String, Object>> citations) {
        if (citations.isEmpty()) {
            return null;
        }
        try {
            return RAG_CITATIONS_PREFIX + objectMapper.writeValueAsString(citations);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not persist RAG citations", exception);
        }
    }

    private List<Map<String, Object>> readCitations(ChatMessage message) {
        String sources = message.getSources();
        if (sources == null || !sources.startsWith(RAG_CITATIONS_PREFIX)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(sources.substring(RAG_CITATIONS_PREFIX.length()), CITATIONS_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored RAG citations are invalid", exception);
        }
    }

    private List<ChatSessionAttachment> checkedSources(UUID sessionId) {
        List<ChatSessionAttachment> sources = attachmentRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .filter(ChatSessionAttachment::isChecked)
                .toList();
        if (sources.stream().anyMatch(source -> source.getDocument().getStatus() != DocumentStatus.READY)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A selected document is not ready for RAG");
        }
        return sources;
    }

    private ChatSession findAuthorizedSession(UUID ownerId, UUID sessionId) {
        ChatSession session = findSession(sessionId);
        requireSessionAccess(ownerId, session);
        return session;
    }

    private void requireSessionAccess(UUID ownerId, ChatSession session) {
        if (session.getOwner() == null || !ownerId.equals(session.getOwner().getId())) {
            throw new ServiceEntityNotFoundException("Conversation not found: " + session.getId());
        }
        if (session.getWorkspace() != null) {
            workspaceAccess.requireReadAccess(ownerId, session.getWorkspace().getId(), List.of());
        }
    }

    private void saveMessage(ChatSession session, MessageRole role, String content) {
        ChatMessage message = new ChatMessage();
        message.setSession(session);
        message.setRole(role);
        message.setContent(content);
        message.setTokenCount(0L);
        message.setCost(0d);
        chatMessageRepository.save(message);
    }

    private StudyWorkspaceResponse toResponse(ChatSession session) {
        UUID workspaceId = session.getWorkspace() != null ? session.getWorkspace().getId() : null;

        List<StudyWorkspaceResponse.Source> sources = attachmentRepository
                .findBySessionIdOrderByCreatedAtAsc(session.getId())
                .stream()
                .map(this::toSource)
                .toList();

        List<StudyWorkspaceResponse.Message> messages = chatMessageRepository
                .findBySessionIdOrderByCreatedAtAsc(session.getId())
                .stream()
                .map(this::toMessage)
                .toList();

        List<StudyWorkspaceResponse.Note> notes = workspaceId == null
                ? List.of()
                : noteRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                        .stream()
                        .map(this::toNote)
                        .toList();

        List<StudyWorkspaceResponse.StudioTool> tools = TOOLS.stream()
                .map(tool -> new StudyWorkspaceResponse.StudioTool(
                        tool.id(), tool.label(), tool.icon(), tool.color(), true))
                .toList();

        int activeSourceCount = (int) sources.stream().filter(StudyWorkspaceResponse.Source::checked).count();

        return new StudyWorkspaceResponse(
                session.getId(),
                workspaceId,
                session.getTitle() != null && !session.getTitle().isBlank() ? session.getTitle() : DEFAULT_TITLE,
                sources,
                messages,
                notes,
                tools,
                activeSourceCount);
    }

    private StudyWorkspaceResponse.Source toSource(ChatSessionAttachment attachment) {
        Document document = attachment.getDocument();
        return new StudyWorkspaceResponse.Source(
                attachment.getId(),
                document.getId(),
                document.getFilename(),
                document.getFileType() == null ? "txt" : document.getFileType().toLowerCase(Locale.ROOT),
                document.getFileSizeFormatted() != null && !document.getFileSizeFormatted().isBlank()
                ? document.getFileSizeFormatted()
                : formatSize(document.getFileSizeBytes()),
                attachment.isChecked(),
                document.getStoragePath() != null && !document.getStoragePath().isBlank());
    }

    private StudyWorkspaceResponse.Message toMessage(ChatMessage message) {
        boolean assistant = message.getRole() == MessageRole.ASSISTANT;
        Instant createdAt = message.getCreatedAt();
        String timestamp = createdAt == null
                ? ""
                : TIME.format(createdAt);

        return new StudyWorkspaceResponse.Message(
                message.getId(),
                assistant ? "ai" : "user",
                message.getContent() == null ? "" : message.getContent(),
                timestamp,
                readCitations(message));
    }

    private StudyWorkspaceResponse.Note toNote(StudyNote note) {
        Instant created = note.getCreatedAt();
        String label;
        if (created == null) {
            label = "";
        } else {
            var date = created.atZone(ZoneId.systemDefault()).toLocalDate();
            var today = java.time.LocalDate.now();
            label = date.equals(today) ? "Hôm nay" : DAY.format(date);
        }
        return new StudyWorkspaceResponse.Note(note.getId(), note.getTitle(), note.getContent(), label);
    }

    private String formatSize(Long bytes) {
        if (bytes == null || bytes <= 0) {
            return "—";
        }
        if (bytes < 1024 * 1024) {
            return String.format("%.1f KB", bytes / 1024.0);
        }
        return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
    }

    /**
     * Chọn conversation cho notebook: theo id nếu có, ngược lại conversation
     * mới nhất trong workspace. Chưa có thì tạo mới khi createIfMissing = true.
     */
    private ChatSession resolveSession(UUID ownerId, UUID workspaceId, UUID sessionId, boolean createIfMissing) {
        if (sessionId != null) {
            ChatSession session = findAuthorizedSession(ownerId, sessionId);
            if (workspaceId != null
                    && (session.getWorkspace() == null || !workspaceId.equals(session.getWorkspace().getId()))) {
                throw new ServiceEntityNotFoundException("Conversation not found: " + sessionId);
            }
            return session;
        }
        if (workspaceId == null) {
            workspaceId = resolveWorkspaceId(ownerId);
        }
        if (workspaceId == null) {
            throw new IllegalArgumentException("ownerId or workspaceId is required");
        }
        workspaceAccess.requireReadAccess(ownerId, workspaceId, List.of());

        UUID targetWorkspaceId = workspaceId;
        List<ChatSession> sessions = chatSessionRepository.findByWorkspaceIdOrderByUpdatedAtDesc(targetWorkspaceId)
                .stream()
                .filter(session -> session.getOwner() != null && ownerId.equals(session.getOwner().getId()))
                .toList();
        if (!sessions.isEmpty()) {
            return sessions.get(0);
        }
        if (!createIfMissing) {
            throw new ServiceEntityNotFoundException("No conversation in this workspace yet");
        }

        Workspace workspace = workspaceRepository.findById(targetWorkspaceId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + targetWorkspaceId));
        User owner = ownerId != null
                ? userRepository.findById(ownerId).orElse(null)
                : workspace.getOwner();
        if (owner == null) {
            owner = workspace.getOwner();
        }

        ChatSession created = new ChatSession();
        created.setTitle(DEFAULT_TITLE);
        created.setOwner(owner);
        created.setWorkspace(workspace);
        return chatSessionRepository.save(created);
    }

    private UUID resolveWorkspaceId(UUID ownerId) {
        if (ownerId == null) {
            return null;
        }
        List<Workspace> owned = workspaceRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        return owned.isEmpty() ? null : owned.get(0).getId();
    }

    private Document resolveDocument(ChatSession session, StudySourceRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("documentId or filename is required");
        }
        Document document;
        if (request.documentId() != null) {
            document = documentRepository.findById(request.documentId())
                    .orElseThrow(() -> new ServiceEntityNotFoundException(
                            "Document not found: " + request.documentId()));
        } else {
            if (request.filename() == null || request.filename().isBlank()) {
                throw new IllegalArgumentException("documentId or filename is required");
            }
            if (session.getWorkspace() == null) {
                throw new IllegalArgumentException("Conversation has no workspace to attach documents from");
            }

            String filename = request.filename().trim();
            document = documentRepository.findByWorkspaceIdOrderByCreatedAtDesc(session.getWorkspace().getId())
                    .stream()
                    .filter(item -> item.getFilename() != null && item.getFilename().equalsIgnoreCase(filename))
                    .findFirst()
                    .orElseThrow(() -> new ServiceEntityNotFoundException(
                            "No document named " + filename + " in this workspace"));
        }
        if (session.getWorkspace() == null
                || document.getWorkspace() == null
                || !session.getWorkspace().getId().equals(document.getWorkspace().getId())) {
            throw new ServiceEntityNotFoundException("Document not found in this workspace");
        }
        return document;
    }

    private ChatSession findSession(UUID sessionId) {
        if (sessionId == null) {
            throw new IllegalArgumentException("sessionId is required");
        }
        return chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Conversation not found: " + sessionId));
    }
}
