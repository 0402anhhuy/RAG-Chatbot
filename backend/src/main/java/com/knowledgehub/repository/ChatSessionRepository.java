package com.knowledgehub.repository;

import com.knowledgehub.entity.ChatSession;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {
    List<ChatSession> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);
    List<ChatSession> findByWorkspaceIdOrderByUpdatedAtDesc(UUID workspaceId);
    List<ChatSession> findByOwnerId(UUID ownerId);
    List<ChatSession> findByWorkspaceId(UUID workspaceId);
}
