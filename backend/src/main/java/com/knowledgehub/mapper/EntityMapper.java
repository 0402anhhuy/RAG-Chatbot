package com.knowledgehub.mapper;

import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.dto.response.WorkspaceMemberResponse;
import com.knowledgehub.dto.response.WorkspaceResponse;
import com.knowledgehub.dto.response.ProjectResponse;
import com.knowledgehub.entity.ChatMessage;
import com.knowledgehub.entity.ChatSession;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.entity.WorkspaceMember;
import com.knowledgehub.entity.Project;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Component
public class EntityMapper {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("MMM dd, yyyy").withZone(ZoneId.systemDefault());

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
                entity.getOwner() != null ? entity.getOwner().getId() : null,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
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
        return new ChatSessionResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getOwner() != null ? entity.getOwner().getId() : null,
                entity.getWorkspace() != null ? entity.getWorkspace().getId() : null,
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
                entity.getCreatedAt()
        );
    }
}