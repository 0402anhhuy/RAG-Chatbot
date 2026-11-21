package com.knowledgehub.repository;

import com.knowledgehub.entity.RagDocument;
import com.knowledgehub.entity.RagDocumentStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RagDocumentRepository extends JpaRepository<RagDocument, UUID> {

    List<RagDocument> findByStatusNotOrderByCreatedAtDesc(RagDocumentStatus status);

    List<RagDocument> findByWorkspaceIdAndStatusNotOrderByCreatedAtDesc(String workspaceId, RagDocumentStatus status);

    List<RagDocument> findByWorkspaceIdAndStatusOrderByCreatedAtDesc(String workspaceId, RagDocumentStatus status);

    List<RagDocument> findByStatusOrderByCreatedAtDesc(RagDocumentStatus status, Limit limit);

    Optional<RagDocument> findByDocumentIdAndStatusNot(UUID documentId, RagDocumentStatus status);

    Optional<RagDocument> findFirstByChecksumAndWorkspaceIdAndStatusInOrderByCreatedAtDesc(
            String checksum, String workspaceId, Collection<RagDocumentStatus> statuses);
}
