package com.knowledgehub.entity;

import jakarta.persistence.Column;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Đơn giá token của một model. Mọi con số chi phí trên tab Analytics đều được
 * quy ra tiền từ bảng này, nên không cần lưu cost khó kiểm chứng ở nơi khác.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "provider_model_prices",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_provider_model_price",
                columnNames = {"provider", "model"}))
public class ProviderModelPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProviderType provider;

    @Column(nullable = false, length = 120)
    private String model;

    /**
     * USD cho 1 triệu input token.
     */
    @Column(name = "input_per_million", nullable = false, precision = 12, scale = 6)
    private BigDecimal inputPerMillion = BigDecimal.ZERO;

    /**
     * USD cho 1 triệu output token.
     */
    @Column(name = "output_per_million", nullable = false, precision = 12, scale = 6)
    private BigDecimal outputPerMillion = BigDecimal.ZERO;

    /**
     * USD cho 1 triệu token đọc từ prompt cache.
     */
    @Column(name = "cache_read_per_million", nullable = false, precision = 12, scale = 6)
    private BigDecimal cacheReadPerMillion = BigDecimal.ZERO;

    /**
     * USD cho 1 triệu token ghi vào prompt cache.
     */
    @Column(name = "cache_write_per_million", nullable = false, precision = 12, scale = 6)
    private BigDecimal cacheWritePerMillion = BigDecimal.ZERO;

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
