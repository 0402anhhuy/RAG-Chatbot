package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.WorkbenchFileCreateRequest;
import com.knowledgehub.dto.request.WorkbenchFileUpdateRequest;
import com.knowledgehub.dto.request.WorkbenchSettingsUpdateRequest;
import com.knowledgehub.dto.request.WorkbenchSyncRequest;
import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.WorkbenchFileContentResponse;
import com.knowledgehub.dto.response.WorkbenchFileResponse;
import com.knowledgehub.dto.response.WorkbenchSettingsResponse;
import com.knowledgehub.entity.ChatSession;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.WorkbenchConversationSettings;
import com.knowledgehub.entity.WorkbenchFile;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.ChatMessageRepository;
import com.knowledgehub.repository.ChatSessionRepository;
import com.knowledgehub.repository.ProjectAgentRepository;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.ProjectWorkflowRepository;
import com.knowledgehub.repository.UserLlmProviderRepository;
import com.knowledgehub.repository.WorkbenchConversationSettingsRepository;
import com.knowledgehub.repository.WorkbenchFileRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.WorkbenchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class WorkbenchServiceImpl implements WorkbenchService {

    private static final String SKILL_AUTO = "Auto";
    private static final String SKILL_MANUAL = "Manual";
    private static final String WORKSPACE_ROOT = "/workspace";
    private static final DateTimeFormatter TRANSCRIPT_TIME
            = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault());

    /**
     * Model gợi ý cho từng provider khi user chưa chọn gì.
     */
    private static final List<WorkbenchSettingsResponse.ModelOption> DEFAULT_MODELS = List.of(
            new WorkbenchSettingsResponse.ModelOption(ProviderType.OPENAI, "gpt-4o-mini", "GPT-4o mini", false),
            new WorkbenchSettingsResponse.ModelOption(ProviderType.ANTHROPIC, "claude-sonnet-4", "Claude Sonnet 4", false),
            new WorkbenchSettingsResponse.ModelOption(ProviderType.GOOGLE, "gemini-2.0-flash", "Gemini 2.0 Flash", false),
            new WorkbenchSettingsResponse.ModelOption(ProviderType.FPT_CLOUD, "DeepSeek-V3", "DeepSeek V3 (FPT)", false));

    private final ProjectRepository projectRepository;
    private final WorkbenchFileRepository fileRepository;
    private final WorkbenchConversationSettingsRepository settingsRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ProjectAgentRepository agentRepository;
    private final ProjectWorkflowRepository workflowRepository;
    private final UserLlmProviderRepository providerRepository;
    private final EntityMapper entityMapper;

    /**
     * Workspace mặc định: khi project chưa có file nào, seed sẵn một file
     * .gitignore chuẩn để cây thư mục không trống trơn.
     */
    private static final String DEFAULT_GITIGNORE_PATH = ".gitignore";
    private static final String DEFAULT_GITIGNORE_CONTENT = String.join("\n",
            "# Dependencies",
            "node_modules/",
            "",
            "# Build output",
            "dist/",
            "build/",
            "",
            "# Environment & secrets",
            ".env",
            ".env.local",
            "",
            "# OS / editor",
            ".DS_Store",
            "Thumbs.db",
            ".idea/",
            ".vscode/",
            "",
            "# Logs",
            "*.log",
            "");

    // ------------------------------------------------------------------ files
    @Override
    public List<WorkbenchFileResponse> listFiles(UUID projectId, String search, String extension, boolean tree) {
        Project project = findProject(projectId);
        String keyword = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String extFilter = extension == null ? "" : extension.trim().toLowerCase(Locale.ROOT);

        List<WorkbenchFile> files = fileRepository.findByProjectIdOrderByPathAsc(projectId);

        // Workspace trống: seed .gitignore mặc định một lần duy nhất
        if (files.isEmpty()
                && (keyword.isEmpty() || DEFAULT_GITIGNORE_PATH.contains(keyword))
                && (extFilter.isEmpty() || DEFAULT_GITIGNORE_PATH.endsWith("." + extFilter))) {
            files = List.of(saveFile(project, DEFAULT_GITIGNORE_PATH, DEFAULT_GITIGNORE_CONTENT, false));
        }

        if (tree) {
            // Chế độ cây: folder (suy ra từ path) đứng trước file trong cùng cấp cha.
            return sortForTree(files).stream()
                    .filter(file -> matches(file, keyword, extFilter))
                    .map(WorkbenchFileResponse::fromEntity)
                    .toList();
        }
        return files.stream()
                .filter(file -> matches(file, keyword, extFilter))
                .map(WorkbenchFileResponse::fromEntity)
                .toList();
    }

    @Override
    public WorkbenchFileResponse createFile(UUID projectId, WorkbenchFileCreateRequest request) {
        Project project = findProject(projectId);
        String path = normalizePath(request.path());
        if (fileRepository.existsByProjectIdAndPath(projectId, path)) {
            throw new IllegalArgumentException("A file already exists at " + path);
        }
        return WorkbenchFileResponse.fromEntity(saveFile(project, path, request.content(), true));
    }

    @Override
    @Transactional(readOnly = true)
    public WorkbenchFileContentResponse getFileContent(UUID projectId, UUID fileId) {
        return WorkbenchFileContentResponse.fromEntity(findFile(projectId, fileId));
    }

    @Override
    public WorkbenchFileContentResponse saveFileContent(
            UUID projectId, UUID fileId, WorkbenchFileUpdateRequest request) {
        WorkbenchFile file = findFile(projectId, fileId);

        if (request != null && request.content() != null) {
            applyContent(file, request.content());
            file.setEditedByUser(true);
        }

        // Đổi path = rename/move: phải cập nhật name/parentPath và chặn trùng đường dẫn.
        if (request != null && request.path() != null && !request.path().isBlank()) {
            String newPath = normalizePath(request.path());
            if (!newPath.equals(file.getPath())) {
                fileRepository.findByProjectIdAndPath(projectId, newPath)
                        .filter(other -> !other.getId().equals(file.getId()))
                        .ifPresent(other -> {
                            throw new IllegalArgumentException("A file already exists at " + newPath);
                        });
                file.setPath(newPath);
                file.setName(nameOf(newPath));
                file.setParentPath(parentOf(newPath));
            }
        }

        return WorkbenchFileContentResponse.fromEntity(fileRepository.save(file));
    }

    @Override
    public void deleteFile(UUID projectId, UUID fileId) {
        fileRepository.delete(findFile(projectId, fileId));
    }

    @Override
    public List<WorkbenchFileResponse> syncToWorkspace(UUID projectId, List<WorkbenchSyncRequest> files) {
        Project project = findProject(projectId);
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("No files were provided to sync");
        }

        List<WorkbenchFile> saved = new ArrayList<>();
        for (WorkbenchSyncRequest item : files) {
            if (item == null || item.path() == null || item.path().isBlank()) {
                continue;
            }
            String path = normalizePath(item.path());
            WorkbenchFile file = fileRepository.findByProjectIdAndPath(projectId, path)
                    .orElseGet(() -> {
                        WorkbenchFile created = new WorkbenchFile();
                        created.setProject(project);
                        created.setPath(path);
                        created.setName(nameOf(path));
                        created.setParentPath(parentOf(path));
                        return created;
                    });
            applyContent(file, item.content() != null ? item.content() : "");
            file.setEditedByUser(true);
            saved.add(fileRepository.save(file));
        }

        if (saved.isEmpty()) {
            throw new IllegalArgumentException("No valid paths were provided to sync");
        }
        return sortedResponses(saved);
    }

    @Override
    public WorkbenchFileResponse uploadFile(UUID projectId, String path, String content) {
        Project project = findProject(projectId);
        String normalized = normalizePath(path);
        WorkbenchFile file = fileRepository.findByProjectIdAndPath(projectId, normalized)
                .orElseGet(() -> {
                    WorkbenchFile created = new WorkbenchFile();
                    created.setProject(project);
                    created.setPath(normalized);
                    created.setName(nameOf(normalized));
                    created.setParentPath(parentOf(normalized));
                    return created;
                });
        applyContent(file, content != null ? content : "");
        file.setEditedByUser(true);
        return WorkbenchFileResponse.fromEntity(fileRepository.save(file));
    }

    // ------------------------------------------------------------- transcript
    @Override
    @Transactional(readOnly = true)
    public String buildTranscript(UUID projectId, UUID conversationId) {
        Project project = findProject(projectId);
        StringBuilder builder = new StringBuilder();
        builder.append("# ").append(project.getName()).append(" — transcript\n\n");

        List<ChatSession> sessions;
        if (conversationId != null) {
            ChatSession session = findConversation(projectId, conversationId);
            sessions = List.of(session);
        } else {
            sessions = chatSessionRepository.findByOwnerIdOrderByUpdatedAtDesc(
                    project.getOwner() != null ? project.getOwner().getId() : UUID.randomUUID());
        }

        if (sessions.isEmpty()) {
            builder.append("_No conversation in this project yet._\n");
        }

        for (ChatSession session : sessions) {
            builder.append("## ").append(session.getTitle()).append("\n\n");
            if (session.getModel() != null) {
                builder.append("- Model: `").append(session.getModel()).append("`\n");
            }
            builder.append("- Updated: ").append(TRANSCRIPT_TIME.format(session.getUpdatedAt())).append("\n\n");

            List<ChatMessageResponse> messages = chatMessageRepository
                    .findBySessionIdOrderByCreatedAtAsc(session.getId())
                    .stream()
                    .map(entityMapper::toChatMessageResponse)
                    .toList();

            if (messages.isEmpty()) {
                builder.append("_No messages._\n\n");
                continue;
            }
            for (ChatMessageResponse message : messages) {
                builder.append("**").append(roleLabel(message)).append("** ")
                        .append(TRANSCRIPT_TIME.format(message.createdAt()))
                        .append("\n\n")
                        .append(message.content())
                        .append("\n\n---\n\n");
            }
        }
        return builder.toString();
    }

    // --------------------------------------------------------------- settings
    @Override
    @Transactional(readOnly = true)
    public WorkbenchSettingsResponse getSettings(UUID projectId, UUID conversationId) {
        Project project = findProject(projectId);
        WorkbenchConversationSettings settings = conversationId == null
                ? null
                : settingsRepository.findByConversationId(conversationId).orElse(null);

        return toSettingsResponse(project, conversationId, settings);
    }

    @Override
    public WorkbenchSettingsResponse updateSettings(
            UUID projectId, UUID conversationId, WorkbenchSettingsUpdateRequest request) {
        Project project = findProject(projectId);
        ChatSession conversation = findConversation(projectId, conversationId);

        WorkbenchConversationSettings settings = settingsRepository
                .findByConversationId(conversationId)
                .orElseGet(() -> {
                    WorkbenchConversationSettings created = new WorkbenchConversationSettings();
                    created.setConversation(conversation);
                    created.setProvider(conversation.getProvider());
                    created.setModel(conversation.getModel());
                    return created;
                });

        if (request != null) {
            if (Boolean.TRUE.equals(request.clearAgent())) {
                settings.setAgent(null);
            } else if (request.agentId() != null) {
                settings.setAgent(agentRepository.findByIdAndProjectId(request.agentId(), projectId)
                        .orElseThrow(() -> new ServiceEntityNotFoundException(
                                "Agent not found in this project: " + request.agentId())));
            }

            if (Boolean.TRUE.equals(request.clearWorkflow())) {
                settings.setWorkflow(null);
            } else if (request.workflowId() != null) {
                settings.setWorkflow(workflowRepository.findByIdAndProjectId(request.workflowId(), projectId)
                        .orElseThrow(() -> new ServiceEntityNotFoundException(
                                "Workflow not found in this project: " + request.workflowId())));
            }

            if (request.provider() != null) {
                settings.setProvider(request.provider());
                // Đổi provider mà model cũ không gửi kèm thì bỏ model để FE chọn lại.
                if (request.model() == null || request.model().isBlank()) {
                    settings.setModel(null);
                }
            }
            if (request.model() != null && !request.model().isBlank()) {
                settings.setModel(request.model().trim());
            }
            if (request.skillMode() != null && !request.skillMode().isBlank()) {
                settings.setSkillMode(normalizeSkillMode(request.skillMode()));
            }
            if (request.autoApprove() != null) {
                settings.setAutoApprove(request.autoApprove());
            }
            if (request.hideThinking() != null) {
                settings.setHideThinking(request.hideThinking());
            }
        }

        WorkbenchConversationSettings saved = settingsRepository.save(settings);
        return toSettingsResponse(project, conversationId, saved);
    }

    // ---------------------------------------------------------------- helpers
    private WorkbenchSettingsResponse toSettingsResponse(
            Project project, UUID conversationId, WorkbenchConversationSettings settings) {
        UUID ownerId = project.getOwner() != null ? project.getOwner().getId() : null;
        Set<ProviderType> connected = new LinkedHashSet<>();
        if (ownerId != null) {
            providerRepository.findByUserIdOrderByProviderTypeAsc(ownerId)
                    .forEach(provider -> connected.add(provider.getProviderType()));
        }

        List<WorkbenchSettingsResponse.Option> agents = agentRepository
                .findByProjectIdOrderByCreatedAtAsc(project.getId())
                .stream()
                .map(agent -> new WorkbenchSettingsResponse.Option(
                        agent.getId(), agent.getName(), agent.getColor(), agent.getPermissionPreset()))
                .toList();

        List<WorkbenchSettingsResponse.Option> workflows = workflowRepository
                .findByProjectIdOrderByCreatedAtAsc(project.getId())
                .stream()
                .map(workflow -> new WorkbenchSettingsResponse.Option(
                        workflow.getId(), workflow.getName(), workflow.getColor(), workflow.getStepsSummary()))
                .toList();

        List<WorkbenchSettingsResponse.ModelOption> models = DEFAULT_MODELS.stream()
                .map(model -> new WorkbenchSettingsResponse.ModelOption(
                        model.provider(), model.model(), model.label(), connected.contains(model.provider())))
                .toList();

        return new WorkbenchSettingsResponse(
                conversationId,
                settings != null && settings.getAgent() != null ? settings.getAgent().getId() : null,
                settings != null && settings.getWorkflow() != null ? settings.getWorkflow().getId() : null,
                settings != null ? settings.getProvider() : null,
                settings != null ? settings.getModel() : null,
                settings != null ? settings.getSkillMode() : SKILL_AUTO,
                settings != null && settings.isAutoApprove(),
                settings != null && settings.isHideThinking(),
                agents,
                workflows,
                models);
    }

    private WorkbenchFile saveFile(Project project, String path, String content, boolean editedByUser) {
        WorkbenchFile file = new WorkbenchFile();
        file.setProject(project);
        file.setPath(path);
        file.setName(nameOf(path));
        file.setParentPath(parentOf(path));
        applyContent(file, content != null ? content : "");
        file.setEditedByUser(editedByUser);
        return fileRepository.save(file);
    }

    /**
     * Tính lại extension, size và số dòng mỗi khi nội dung thay đổi.
     */
    private void applyContent(WorkbenchFile file, String content) {
        String safeContent = content != null ? content : "";
        file.setContent(safeContent);
        file.setSizeBytes(safeContent.getBytes(StandardCharsets.UTF_8).length);
        file.setLineCount(safeContent.isEmpty() ? 0 : safeContent.split("\n", -1).length);
        file.setExtension(extensionOf(file.getName()));
    }

    private boolean matches(WorkbenchFile file, String keyword, String extension) {
        boolean keywordOk = keyword.isEmpty() || file.getPath().toLowerCase(Locale.ROOT).contains(keyword);
        boolean extensionOk = extension.isEmpty()
                || file.getExtension().equalsIgnoreCase(extension);
        return keywordOk && extensionOk;
    }

    private List<WorkbenchFile> sortForTree(List<WorkbenchFile> files) {
        // Folder đứng trước: so sánh theo từng cấp của path, cấp nào là thư mục thì đứng trước.
        return files.stream()
                .sorted(Comparator
                        .comparing((WorkbenchFile file) -> file.getParentPath()
                                .toLowerCase(Locale.ROOT))
                        .thenComparing(file -> file.getName().toLowerCase(Locale.ROOT)))
                .toList();
    }

    private List<WorkbenchFileResponse> sortedResponses(List<WorkbenchFile> files) {
        return sortForTree(files).stream().map(WorkbenchFileResponse::fromEntity).toList();
    }

    /**
     * Chuẩn hoá path: bỏ "/" đầu, gộp "//", chặn ".." để không thoát khỏi
     * workspace.
     */
    private String normalizePath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            throw new IllegalArgumentException("path is required");
        }
        String path = rawPath.trim().replace('\\', '/');
        while (path.startsWith("/")) {
            path = path.substring(1);
        }
        while (path.contains("//")) {
            path = path.replace("//", "/");
        }
        if (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        if (path.isEmpty() || path.contains("..")) {
            throw new IllegalArgumentException("Invalid file path: " + rawPath);
        }
        return path;
    }

    private String nameOf(String path) {
        int slash = path.lastIndexOf('/');
        return slash < 0 ? path : path.substring(slash + 1);
    }

    private String parentOf(String path) {
        int slash = path.lastIndexOf('/');
        return slash < 0 ? "" : path.substring(0, slash);
    }

    private String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 || dot == name.length() - 1 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String normalizeSkillMode(String value) {
        return SKILL_MANUAL.equalsIgnoreCase(value.trim()) ? SKILL_MANUAL : SKILL_AUTO;
    }

    private String roleLabel(ChatMessageResponse message) {
        return message.role() == null ? "ASSISTANT" : message.role().name();
    }

    private Project findProject(UUID projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));
    }

    private WorkbenchFile findFile(UUID projectId, UUID fileId) {
        return fileRepository.findById(fileId)
                .filter(file -> file.getProject() != null && file.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ServiceEntityNotFoundException("File not found: " + fileId));
    }

    private ChatSession findConversation(UUID projectId, UUID conversationId) {
        if (conversationId == null) {
            throw new IllegalArgumentException("conversationId is required");
        }
        ChatSession conversation = chatSessionRepository.findById(conversationId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Conversation not found: " + conversationId));
        if (conversation.getProject() == null || !conversation.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Conversation does not belong to this project");
        }
        return conversation;
    }
}
