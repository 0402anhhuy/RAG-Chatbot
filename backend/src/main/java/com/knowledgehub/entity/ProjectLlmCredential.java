package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * API key LLM cấu hình riêng cho một project (tab Settings → LLM + Budget).
 *
 * <p>
 * Khác với {@link UserLlmProvider} (key cá nhân dùng mọi project), bản ghi này
 * chỉ áp dụng cho đúng một project. Mỗi project giữ tối đa một key cho mỗi
 * provider (unique project_id + provider_type).
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "project_llm_credentials",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_project_llm_credential",
                columnNames = {"project_id", "provider_type"}),
        indexes = @Index(name = "idx_project_llm_credential_project", columnList = "project_id"))
public class ProjectLlmCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 30)
    private ProviderType providerType;

    @Column(name = "endpoint_code", length = 50)
    private String endpointCode;

    @Column(name = "api_key", nullable = false, columnDefinition = "TEXT")
    private String apiKey;

    /**
     * Kết quả lần kiểm tra key gần nhất (null = chưa kiểm tra).
     */
    @Column(name = "verified", nullable = false)
    private boolean verified;

    @Column(name = "last_verified_at")
    private Instant lastVerifiedAt;

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
