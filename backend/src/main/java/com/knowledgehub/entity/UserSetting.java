package com.knowledgehub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
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
import java.time.LocalDate;
import java.util.UUID;

/**
 * Cấu hình cá nhân của một user: hạn mức chi tiêu cho Starter Kit. Mỗi user có
 * tối đa một bản ghi (unique user_id).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "user_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_settings_user", columnNames = "user_id"))
public class UserSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "starter_kit_monthly_limit", nullable = false, precision = 12, scale = 2)
    private BigDecimal starterKitMonthlyLimit;

    @Column(name = "budget_reset_day", nullable = false)
    private int budgetResetDay;

    @Convert(converter = LocalDateConverter.class)
    @Column(name = "last_budget_reset_on")
    private LocalDate lastBudgetResetOn;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (starterKitMonthlyLimit == null) {
            starterKitMonthlyLimit = BigDecimal.ZERO;
        }
        if (budgetResetDay < 1 || budgetResetDay > 28) {
            budgetResetDay = 1;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
