package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.response.LearningAnalyticsResponse;

import java.util.UUID;

/**
 * Số liệu học tập của tab Analytics (Academy Hub).
 */
public interface LearningAnalyticsService {

    /**
     * @param range 7d | 30d | all (mặc định 30d)
     * @param userId người học; null thì chỉ trả số liệu không gắn người
     */
    LearningAnalyticsResponse getAnalytics(UUID ownerId, UUID workspaceId, UUID userId, String range);
}
