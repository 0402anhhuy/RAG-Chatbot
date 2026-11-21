package com.knowledgehub.repository;

import com.knowledgehub.entity.RagDocumentChunk;
import com.knowledgehub.entity.RagDocumentStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface RagDocumentChunkRepository extends JpaRepository<RagDocumentChunk, String> {

    List<RagDocumentChunk> findByDocumentIdOrderByChunkIndexAsc(UUID documentId);

    long countByDocumentId(UUID documentId);

    List<RagDocumentChunk> findByDocumentIdInOrderByDocumentIdAscChunkIndexAsc(Collection<UUID> documentIds);

    @Modifying
    @Transactional
    long deleteByDocumentId(UUID documentId);

    @Modifying
    @Transactional
    @Query("delete from RagDocumentChunk c where c.documentId in :documentIds")
    int deleteByDocumentIdIn(@Param("documentIds") Collection<UUID> documentIds);

    /**
     * Chỉ chunk của tài liệu đang ở trạng thái cho phép index mới được đưa vào
     * BM25/Qdrant. Có {@code limit} để lần build incremental không nạp cả kho.
     */
    @Query("""
            select c from RagDocumentChunk c
            where c.documentId in (
                select d.documentId from RagDocument d where d.status in :statuses
            )
            order by c.documentId asc, c.chunkIndex asc
            """)
    List<RagDocumentChunk> findIndexable(
            @Param("statuses") Collection<RagDocumentStatus> statuses, Limit limit);
}
