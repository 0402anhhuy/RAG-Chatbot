package com.knowledgehub.mapper;

import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.dto.response.WorkspaceMemberResponse;
import com.knowledgehub.dto.response.WorkspaceResponse;
import com.knowledgehub.dto.response.ProjectResponse;
import com.knowledgehub.dto.response.TaskResponse;
import com.knowledgehub.entity.ChatMessage;
import com.knowledgehub.entity.ChatSession;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.Task;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.entity.WorkspaceMember;
import com.knowledgehub.entity.Project;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Component
public class EntityMapper {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("MMM dd, yyyy").withZone(ZoneId.systemDefault());

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("MMM d, hh:mm a").withZone(ZoneId.systemDefault());

    public UserResponse toUserResponse(User entity) {
        if (entity == null) return null;
        return new UserResponse(
                entity.getId(),
                entity.getName(),
                entity.getPhone(),
                entity.getEmail(),
                entity.getRole(),
                entity.isActive()
        );
    }

    public WorkspaceResponse toWorkspaceResponse(Workspace entity) {
        if (entity == null) return null;
        return new WorkspaceResponse(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getOwner() != null ? entity.getOwner().getId() : null,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public WorkspaceMemberResponse toWorkspaceMemberResponse(WorkspaceMember entity) {
        if (entity == null) return null;
        return new WorkspaceMemberResponse(
                entity.getId(),
                entity.getWorkspace() != null ? entity.getWorkspace().getId() : null,
                entity.getUser() != null ? entity.getUser().getId() : null,
                entity.getRole(),
                entity.getJoinedAt()
        );
    }

    public ProjectResponse toProjectResponse(Project entity) {
        if (entity == null) return null;
        return new ProjectResponse(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getType(),
                entity.getStatus(),
                entity.isPinned(),
                entity.getRepositoryUrl(),
                entity.getTaskCount(),
                entity.getMemberCount(),
                entity.getOwner() != null ? entity.getOwner().getName() : null,
                entity.getOwner() != null ? entity.getOwner().getId() : null,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public TaskResponse toTaskResponse(Task entity) {
        if (entity == null) return null;
        Project project = entity.getProject();
        User assignee = entity.getAssignee();
        return new TaskResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getDescription(),
                project != null ? project.getId() : null,
                project != null ? project.getName() : null,
                assignee != null ? assignee.getId() : null,
                assignee != null ? assignee.getName() : null,
                assignee != null ? assignee.getEmail() : null,
                entity.getStatus(),
                formatEnumLabel(entity.getStatus()),
                entity.getPriority(),
                formatEnumLabel(entity.getPriority()),
                splitLabels(entity.getLabels()),
                entity.getStoryPoints(),
                entity.getOriginalEstimate(),
                entity.getRemainingEstimate(),
                entity.isArchived(),
                entity.getArchivedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getUpdatedAt() != null ? DATE_TIME_FORMATTER.format(entity.getUpdatedAt()) : null
        );
    }

    private String formatEnumLabel(Enum<?> value) {
        if (value == null) return null;
        String[] words = value.name().toLowerCase().split("_");
        StringBuilder label = new StringBuilder();
        for (String word : words) {
            if (word.isEmpty()) continue;
            if (!label.isEmpty()) label.append(' ');
            label.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return label.toString();
    }

    private List<String> splitLabels(String labels) {
        if (labels == null || labels.isBlank()) return new ArrayList<>();
        return Arrays.stream(labels.split(","))
                .map(String::trim)
                .filter(label -> !label.isEmpty())
                .toList();
    }

    public DocumentResponse toDocumentResponse(Document entity) {
        if (entity == null) return null;

        String uploadedAt = entity.getCreatedAt() != null
                ? DATE_FORMATTER.format(entity.getCreatedAt())
                : "Just now";

        return new DocumentResponse(
                entity.getId(),
                entity.getFilename(),
                entity.getFilename(), // title (alias cho UI)
                entity.getFileType(),
                entity.getFileType(), // type (alias cho UI)
                entity.getFileSizeBytes(),
                entity.getFileSizeFormatted(),
                entity.getFileSizeFormatted(), // size (alias cho UI)
                entity.getStoragePath(),
                entity.getCourseCode(),
                entity.getWorkspace() != null ? entity.getWorkspace().getId() : null,
                entity.getStatus(),
                entity.getChunkCount(),
                entity.getChunkCount(), // chunks (alias cho UI)
                entity.getCreatedAt(),
                uploadedAt
        );
    }

    public ChatSessionResponse toChatSessionResponse(ChatSession entity) {
        if (entity == null) return null;

        Project project = entity.getProject();
        Workspace workspace = entity.getWorkspace();

        return new ChatSessionResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getOwner() != null ? entity.getOwner().getId() : null,
                workspace != null ? workspace.getId() : null,
                workspace != null ? workspace.getName() : null,
                project != null ? project.getId() : null,
                project != null ? project.getName() : null,
                entity.getModel(),
                entity.getPromptTokens(),
                entity.getCompletionTokens(),
                entity.getTotalTokens(),
                entity.getTotalCost(),
                entity.isArchived(),
                entity.isBookmarked(),
                entity.getArchivedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public ChatMessageResponse toChatMessageResponse(ChatMessage entity) {
        if (entity == null) return null;
        return new ChatMessageResponse(
                entity.getId(),
                entity.getSession() != null ? entity.getSession().getId() : null,
                entity.getRole(),
                entity.getContent(),
                entity.getSources(),
                entity.getTokenCount(),
                entity.getCost(),
                entity.getCreatedAt()
        );
    }
}