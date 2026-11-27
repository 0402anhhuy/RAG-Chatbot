package com.knowledgehub.entity;

import com.knowledgehub.security.EncryptedStringConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * API key cá nhân cho một LLM provider của user. Mỗi user chỉ giữ một key cho
 * mỗi provider (unique user_id + provider_type).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "user_llm_providers",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_llm_provider",
                columnNames = {"user_id", "provider_type"}))
public class UserLlmProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 30)
    private ProviderType providerType;

    @Column(name = "endpoint_code", length = 50)
    private String endpointCode;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "api_key", nullable = false, columnDefinition = "TEXT")
    private String apiKey;

    /**
     * Model mặc định của provider; null/blank → catalog default.
     */
    @Column(length = 120)
    private String model;

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
