package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Một đoạn văn bản đã trích xuất từ tài liệu RAG.
 *
 * <p>
 * Chỉ phần text nằm ở BE; vector của chunk nằm trong Qdrant/FAISS và dùng chung
 * {@link #chunkId} làm khóa. {@code chunk_id} do rag-service sinh nên là chuỗi.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "rag_document_chunks",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_rag_chunk_document_index",
                columnNames = {"document_id", "chunk_index"}),
        indexes = @Index(name = "idx_rag_document_chunks_document", columnList = "document_id, chunk_index"))
public class RagDocumentChunk {

    @Id
    @Column(name = "chunk_id", length = 128)
    private String chunkId;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(name = "section_path", columnDefinition = "TEXT")
    private String sectionPath;

    @Column(nullable = false, length = 64)
    private String checksum;

    @Column(name = "metadata_json", nullable = false, columnDefinition = "TEXT")
    private String metadataJson = "{}";

    @PrePersist
    void onCreate() {
        if (metadataJson == null || metadataJson.isBlank()) {
            metadataJson = "{}";
        }
    }
}
