package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Tài liệu được gắn làm nguồn cho một conversation học tập (cột "Nguồn" ở tab
 * Conversations của Academy Hub).
 *
 * <p>
 * Một tài liệu có thể được dùng cho nhiều conversation, nên đây là bảng nối
 * (conversation_id, document_id) chứ không phải quan hệ 1-1.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "chat_session_attachments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_session_attachment",
                columnNames = {"session_id", "document_id"}),
        indexes = @Index(name = "idx_session_attachment_session", columnList = "session_id"))
public class ChatSessionAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @ManyToOne(optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    /**
     * Người dùng đang bật nguồn này để đưa vào ngữ cảnh hỏi đáp.
     */
    @Column(nullable = false)
    private boolean checked = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
