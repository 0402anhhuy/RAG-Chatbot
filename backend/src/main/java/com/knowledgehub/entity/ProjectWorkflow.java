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
 * Workflow template của một project (tab Workflows).
 *
 * <p>
 * BUILT_IN: mẫu dựng sẵn, được tạo tự động (lazy) cho mỗi project và readonly.
 * CUSTOM: do người dùng tạo, có thể đổi tên / xoá.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "project_workflows",
        indexes = @Index(name = "idx_project_workflow_project", columnList = "project_id"))
public class ProjectWorkflow {

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
    @Column(name = "workflow_type", nullable = false, length = 20)
    private WorkflowType type = WorkflowType.CUSTOM;

    /**
     * Mã mẫu dựng sẵn (vd: rfp-to-demo). null với workflow tự tạo.
     */
    @Column(name = "template_key", length = 80)
    private String templateKey;

    /**
     * Tóm tắt chuỗi bước, vd: PDF → PM → (SA || Cloud) → PM Review
     */
    @Column(name = "steps_summary", columnDefinition = "TEXT")
    private String stepsSummary;

    @Column(name = "node_count", nullable = false)
    private int nodeCount;

    @Column(nullable = false, length = 20)
    private String color = "#3B82F6";

    /**
     * Id icon (xem danh sách icon ở UI, vd: layers, code, db).
     */
    @Column(name = "icon_key", length = 40)
    private String iconKey = "layers";

    @Enumerated(EnumType.STRING)
    @Column(name = "last_run_status", length = 20)
    private WorkflowRunStatus lastRunStatus;

    @Column(name = "last_run_at")
    private Instant lastRunAt;

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
            type = WorkflowType.CUSTOM;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
