package com.knowledgehub.repository;

import com.knowledgehub.entity.ChatSessionAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatSessionAttachmentRepository extends JpaRepository<ChatSessionAttachment, UUID> {

    List<ChatSessionAttachment> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    Optional<ChatSessionAttachment> findBySessionIdAndDocumentId(UUID sessionId, UUID documentId);

    Optional<ChatSessionAttachment> findByIdAndSessionId(UUID id, UUID sessionId);

    long countBySessionIdAndCheckedTrue(UUID sessionId);

    void deleteBySessionId(UUID sessionId);
}
