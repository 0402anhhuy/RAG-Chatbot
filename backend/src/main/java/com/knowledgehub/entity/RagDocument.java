package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Bản ghi catalog của RAG cho một tài liệu đã được đưa vào index.
 *
 * <p>
 * Khóa chính trùng với {@link Document#getId()} để hai bên luôn tham chiếu được
 * sang nhau. BE sở hữu toàn bộ cột ở đây (checksum, trạng thái ingest, job_id,
 * số chunk); rag-service không còn bảng riêng cho tài liệu.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "rag_documents",
        indexes = {
                @Index(name = "idx_rag_documents_workspace_status", columnList = "workspace_id, status, created_at"),
                @Index(name = "idx_rag_documents_checksum", columnList = "workspace_id, checksum, status")
        })
public class RagDocument {

    @Id
    private UUID documentId;

    @Column(name = "workspace_id", length = 64)
    private String workspaceId;

    @Column(name = "course_code", length = 50)
    private String courseCode;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(name = "source_path", nullable = false, columnDefinition = "TEXT")
    private String sourcePath;

    @Column(nullable = false, length = 64)
    private String checksum;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RagDocumentStatus status = RagDocumentStatus.QUEUED;

    @Column(name = "job_id", length = 64)
    private String jobId;

    @Column(name = "chunk_count", nullable = false)
    private int chunkCount;

    @Column(columnDefinition = "TEXT")
    private String error;

    /** Metadata tự do (content type, nguồn migrate...) ở dạng JSON. */
    @Column(name = "metadata_json", nullable = false, columnDefinition = "TEXT")
    private String metadataJson = "{}";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (metadataJson == null || metadataJson.isBlank()) {
            metadataJson = "{}";
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
