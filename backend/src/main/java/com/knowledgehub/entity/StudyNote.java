package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Ghi chú học tập lưu trong Studio của tab Conversations.
 *
 * <p>
 * Ghi chú gắn với workspace (không gắn conversation) để người học giữ chung một
 * bộ ghi chú như cột "Ghi chú đã lưu" mô tả.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "study_notes",
        indexes = @Index(name = "idx_study_note_workspace", columnList = "workspace_id"))
public class StudyNote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    /**
     * Conversation tạo ra ghi chú này (null nếu tạo tay).
     */
    @ManyToOne
    @JoinColumn(name = "session_id")
    private ChatSession session;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
