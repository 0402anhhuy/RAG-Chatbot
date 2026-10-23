package com.knowledgehub.repository;

import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.DocumentStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
    List<Document> findByWorkspaceIdAndStatus(UUID workspaceId, DocumentStatus status);
    List<Document> findByWorkspaceId(UUID workspaceId);
}
