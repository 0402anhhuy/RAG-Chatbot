package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Cấu hình của thanh prompt ở tab IDE cho một conversation: agent / skill /
 * workflow đang chọn, chế độ auto-approve và hide-thinking.
 *
 * <p>
 * Tách khỏi ChatSession để không làm nặng bảng chat và để các cờ này không lẫn
 * vào dữ liệu hội thoại của tab Conversations.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "workbench_conversation_settings",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_workbench_settings_conversation",
                columnNames = "conversation_id"))
public class WorkbenchConversationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private ChatSession conversation;

    /**
     * Mã provider đang chọn cho prompt (vd: OPENAI). null = chưa chọn model.
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private ProviderType provider;

    @Column(length = 120)
    private String model;

    @ManyToOne
    @JoinColumn(name = "agent_id")
    private ProjectAgent agent;

    @ManyToOne
    @JoinColumn(name = "workflow_id")
    private ProjectWorkflow workflow;

    /**
     * Auto | Manual — trùng với nhãn hiển thị trên nút Skill.
     */
    @Column(name = "skill_mode", nullable = false, length = 20)
    private String skillMode = "Auto";

    @Column(name = "auto_approve", nullable = false)
    private boolean autoApprove;

    @Column(name = "hide_thinking", nullable = false)
    private boolean hideThinking;

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
