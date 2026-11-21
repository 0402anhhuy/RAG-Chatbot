package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Cấu hình của một project (tab Settings): thông tin chung, đường dẫn bị loại
 * khi sync, các hằng số tham chiếu cho Analytics, quyền dùng credential và ngân
 * sách LLM.
 *
 * <p>
 * Mỗi project có đúng một bản ghi (unique project_id). Khi chưa có bản ghi, BE
 * trả về giá trị mặc định thay vì tạo sẵn, để project cũ không bị ghi thêm.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "project_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_project_settings_project", columnNames = "project_id"))
public class ProjectSetting {

    /**
     * Danh sách path bị loại mặc định — trùng với UI.
     */
    public static final String DEFAULT_EXCLUDED_PATHS = String.join("\n",
            "node_modules", "bower_components", "vendor", "jspm_packages",
            "dist", "build", ".next", ".git");

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(length = 2000)
    private String description;

    /**
     * Mỗi dòng một path segment; folder khớp ở bất kỳ độ sâu nào đều bị bỏ qua.
     */
    @Column(name = "excluded_paths", columnDefinition = "TEXT", nullable = false)
    private String excludedPaths = DEFAULT_EXCLUDED_PATHS;

    @Column(name = "hours_per_day", nullable = false)
    private int hoursPerDay = 8;

    @Column(name = "days_per_month", nullable = false)
    private int daysPerMonth = 20;

    /**
     * Đơn giá tham chiếu cho một man-month (không phải hoá đơn).
     */
    @Column(name = "reference_rate", nullable = false, precision = 14, scale = 2)
    private BigDecimal referenceRate = BigDecimal.valueOf(2000);

    /**
     * Cho phép dùng Starter Kit dùng chung của platform trong project này.
     */
    @Column(name = "allow_starter_kit", nullable = false)
    private boolean allowStarterKit = true;

    /**
     * Cho phép thành viên dùng API key cá nhân trong project này.
     */
    @Column(name = "allow_personal_providers", nullable = false)
    private boolean allowPersonalProviders = true;

    @Column(name = "budget_tracking_enabled", nullable = false)
    private boolean budgetTrackingEnabled;

    /**
     * Hạn mức chi tiêu hàng tháng (USD). null = không đặt hạn mức.
     */
    @Column(name = "monthly_budget_limit", precision = 12, scale = 2)
    private BigDecimal monthlyBudgetLimit;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (excludedPaths == null) {
            excludedPaths = DEFAULT_EXCLUDED_PATHS;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
