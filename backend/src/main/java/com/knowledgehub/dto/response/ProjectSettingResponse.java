package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProjectLlmCredential;
import com.knowledgehub.entity.ProjectSetting;
import com.knowledgehub.entity.ProjectStatus;
import com.knowledgehub.entity.ProjectType;
import com.knowledgehub.entity.ProviderType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Toàn bộ dữ liệu tab Settings của một project.
 *
 * @param projectType LOCAL | REMOTE (lấy từ project, không phải mock)
 * @param description mô tả project (rỗng nếu chưa đặt)
 * @param providers danh sách key đã cấu hình cho project; apiKey luôn được che
 */
public record ProjectSettingResponse(
        UUID projectId,
        String name,
        ProjectType projectType,
        ProjectStatus status,
        String repositoryUrl,
        String description,
        String excludedPaths,
        int hoursPerDay,
        int daysPerMonth,
        BigDecimal referenceRate,
        int hoursPerMonth,
        boolean allowStarterKit,
        boolean allowPersonalProviders,
        boolean budgetTrackingEnabled,
        BigDecimal monthlyBudgetLimit,
        List<ProviderCredential> providers,
        Instant updatedAt) {

    /**
     * Key đã cấu hình; apiKeyMasked chỉ để hiển thị, không trả key gốc.
     */
    public record ProviderCredential(
            UUID id,
            ProviderType providerType,
            String endpointCode,
            String apiKeyMasked,
            boolean verified,
            Instant lastVerifiedAt) {

        public static ProviderCredential fromEntity(ProjectLlmCredential entity) {
            return new ProviderCredential(
                    entity.getId(),
                    entity.getProviderType(),
                    entity.getEndpointCode(),
                    mask(entity.getApiKey()),
                    entity.isVerified(),
                    entity.getLastVerifiedAt());
        }

        /**
         * Chỉ giữ 4 ký tự cuối, phần còn lại thay bằng dấu chấm.
         */
        private static String mask(String apiKey) {
            if (apiKey == null || apiKey.isBlank()) {
                return "";
            }
            String trimmed = apiKey.trim();
            if (trimmed.length() <= 4) {
                return "••••";
            }
            return "••••" + trimmed.substring(trimmed.length() - 4);
        }
    }

    public static ProjectSettingResponse from(
            ProjectSetting setting,
            UUID projectId,
            String name,
            ProjectType projectType,
            ProjectStatus status,
            String repositoryUrl,
            List<ProjectLlmCredential> providers) {
        int hoursPerDay = setting != null ? setting.getHoursPerDay() : 8;
        int daysPerMonth = setting != null ? setting.getDaysPerMonth() : 20;
        BigDecimal referenceRate = setting != null ? setting.getReferenceRate() : BigDecimal.valueOf(2000);
        String excluded = setting != null && setting.getExcludedPaths() != null
                ? setting.getExcludedPaths()
                : ProjectSetting.DEFAULT_EXCLUDED_PATHS;

        return new ProjectSettingResponse(
                projectId,
                name,
                projectType,
                status,
                repositoryUrl,
                setting != null ? setting.getDescription() : null,
                excluded,
                hoursPerDay,
                daysPerMonth,
                referenceRate,
                hoursPerDay * daysPerMonth,
                setting == null || setting.isAllowStarterKit(),
                setting == null || setting.isAllowPersonalProviders(),
                setting != null && setting.isBudgetTrackingEnabled(),
                setting != null ? setting.getMonthlyBudgetLimit() : null,
                providers.stream().map(ProviderCredential::fromEntity).toList(),
                setting != null ? setting.getUpdatedAt() : null);
    }
}
