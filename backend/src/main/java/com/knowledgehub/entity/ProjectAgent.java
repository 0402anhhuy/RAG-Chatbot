package com.knowledgehub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Agent template của một project (tab Agents).
 *
 * <p>
 * BUILT_IN: agent dựng sẵn, được tạo tự động (lazy) cho mỗi project và
 * readonly. CUSTOM: do người dùng tạo, có thể đổi cấu hình / xoá.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "project_agents",
        indexes = @Index(name = "idx_project_agent_project", columnList = "project_id"))
public class ProjectAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "agent_type", nullable = false, length = 20)
    private AgentType type = AgentType.CUSTOM;

    /**
     * Mã mẫu dựng sẵn (vd: business-analyst). null với agent tự tạo.
     */
    @Column(name = "template_key", length = 80)
    private String templateKey;

    @Column(nullable = false, length = 20)
    private String color = "#3B82F6";

    /**
     * Id icon (xem danh sách icon ở UI, vd: bot, server, db).
     */
    @Column(name = "icon_key", length = 40)
    private String iconKey = "bot";

    /**
     * Permission preset: Full access | Scoped edits | Docs writer.
     */
    @Column(name = "permission_preset", nullable = false, length = 40)
    private String permissionPreset = "Full access";

    @Column(columnDefinition = "TEXT")
    private String prompt;

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
        if (type == null) {
            type = AgentType.CUSTOM;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
