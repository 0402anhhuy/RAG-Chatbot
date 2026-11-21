package com.knowledgehub.repository;

import com.knowledgehub.entity.RagIngestJob;
import com.knowledgehub.entity.RagIngestJobStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RagIngestJobRepository extends JpaRepository<RagIngestJob, String> {

    List<RagIngestJob> findByStatusOrderByCreatedAtAscUpdatedAtAsc(RagIngestJobStatus status, Limit limit);

    List<RagIngestJob> findByStatusOrderByCreatedAtDesc(RagIngestJobStatus status, Limit limit);

    List<RagIngestJob> findByStatusAndUpdatedAtBeforeOrderByCreatedAtAsc(RagIngestJobStatus status, Instant cutoff);

    long countByStatus(RagIngestJobStatus status);

    boolean existsByDocumentIdAndStatus(UUID documentId, RagIngestJobStatus status);
}
