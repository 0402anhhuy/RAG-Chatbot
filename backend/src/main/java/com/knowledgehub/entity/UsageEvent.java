package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Một lượt dùng LLM (agent step, chat turn, workflow run...) đã được quy ra
 * token và tiền. Đây là nguồn dữ liệu duy nhất cho tab Analytics: cost trend,
 * cost theo provider/model, theo user và lines of code do AI viết.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "usage_events")
public class UsageEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /**
     * Người khởi chạy lượt dùng LLM; null nếu do hệ thống/automation chạy.
     */
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProviderType provider;

    @Column(nullable = false, length = 120)
    private String model;

    /**
     * ACTIVE | ABANDONED — task bị bỏ dở vẫn tốn tiền but không tạo ra kết quả.
     */
    @Column(name = "task_status", length = 20)
    private String taskStatus = "ACTIVE";

    /**
     * SKIPPED (không tính vào Cost / Task) hoặc COMPLETED.
     */
    @Column(name = "outcome_status", length = 20)
    private String outcomeStatus = "SKIPPED";

    @Column(name = "prompt_tokens", nullable = false)
    private long promptTokens;

    @Column(name = "completion_tokens", nullable = false)
    private long completionTokens;

    @Column(name = "cache_read_tokens", nullable = false)
    private long cacheReadTokens;

    @Column(name = "cache_write_tokens", nullable = false)
    private long cacheWriteTokens;

    @Column(name = "total_tokens", nullable = false)
    private long totalTokens;

    /**
     * Số bước agent đã thực hiện trong lượt này.
     */
    @Column(nullable = false)
    private int steps;

    /**
     * Số dòng code AI viết ra (dòng thêm) trong lượt này.
     */
    @Column(name = "lines_added", nullable = false)
    private int linesAdded;

    /**
     * Số dòng code AI xoá trong lượt này.
     */
    @Column(name = "lines_removed", nullable = false)
    private int linesRemoved;

    /**
     * Số file AI đã sửa trong lượt này.
     */
    @Column(name = "files_changed", nullable = false)
    private int filesChanged;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20)
    private UsageActorType actorType = UsageActorType.PLATFORM;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (occurredAt == null) {
            occurredAt = now;
        }
        createdAt = now;
    }
}
