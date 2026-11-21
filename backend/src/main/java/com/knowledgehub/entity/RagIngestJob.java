package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Job ingest tài liệu do rag-service tạo và chạy.
 *
 * <p>
 * BE chỉ lưu trạng thái để trả về cho client và để worker phía rag-service hỏi
 * lại khi khởi động (recover orphaned job).
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "rag_ingest_jobs",
        indexes = {
                @Index(name = "idx_rag_ingest_jobs_status", columnList = "status, updated_at"),
                @Index(name = "idx_rag_ingest_jobs_checksum", columnList = "checksum, status, created_at")
        })
public class RagIngestJob {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "source_path", columnDefinition = "TEXT")
    private String sourcePath;

    @Column(length = 64)
    private String checksum;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RagIngestJobStatus status = RagIngestJobStatus.QUEUED;

    @Column(nullable = false)
    private double progress;

    @Column(columnDefinition = "TEXT")
    private String error;

    @Column(name = "total_chunks", nullable = false)
    private int totalChunks;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts = 3;

    @Column(name = "metadata_json", nullable = false, columnDefinition = "TEXT")
    private String metadataJson = "{}";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

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
