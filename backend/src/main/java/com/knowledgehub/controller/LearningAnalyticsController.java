package com.knowledgehub.controller;

import com.knowledgehub.dto.response.LearningAnalyticsResponse;
import com.knowledgehub.service.interfaces.LearningAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Số liệu học tập của tab Analytics (Academy Hub): mastery, competency
 * breakdown, điểm gần đây và knowledge gap — tất cả tính từ dữ liệu bài làm
 * thật.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/learning-analytics")
public class LearningAnalyticsController {

    private final LearningAnalyticsService learningAnalyticsService;

    /**
     * @param range 7d | 30d | all (mặc định 30d)
     * @param userId người học cần xem số liệu
     */
    @GetMapping
    public ResponseEntity<LearningAnalyticsResponse> getAnalytics(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String range) {
        return ResponseEntity.ok(
                learningAnalyticsService.getAnalytics(ownerId, workspaceId, userId, range));
    }
}
