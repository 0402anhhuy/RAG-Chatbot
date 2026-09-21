package com.knowledgehub.mapper;

import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.dto.response.WorkspaceMemberResponse;
import com.knowledgehub.dto.response.WorkspaceResponse;
import com.knowledgehub.entity.ChatMessage;
import com.knowledgehub.entity.ChatSession;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.entity.WorkspaceMember;
import org.springframework.stereotype.Component;

@Component
public class EntityMapper {

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

    public DocumentResponse toDocumentResponse(Document entity) {
        if (entity == null) return null;
        return new DocumentResponse(
                entity.getId(),
                entity.getFilename(),
                entity.getStoragePath(),
                entity.getWorkspace() != null ? entity.getWorkspace().getId() : null,
                entity.getStatus(),
                entity.getChunkCount(),
                entity.getCreatedAt()
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