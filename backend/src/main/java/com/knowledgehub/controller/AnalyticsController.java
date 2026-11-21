package com.knowledgehub.controller;

import com.knowledgehub.dto.request.UsageEventRequest;
import com.knowledgehub.dto.response.ProjectAnalyticsResponse;
import com.knowledgehub.dto.response.UsageEventResponse;
import com.knowledgehub.service.interfaces.AnalyticsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.UUID;

/**
 * Dữ liệu cho tab Analytics của một project. Mọi con số đều tính từ các lượt
 * dùng LLM đã ghi nhận ({@code usage_events}) và bảng đơn giá model.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects/{projectId}/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<ProjectAnalyticsResponse> getAnalytics(
            @PathVariable UUID projectId,
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(analyticsService.getProjectAnalytics(projectId, parseMonth(month)));
    }

    @PostMapping("/usage")
    public ResponseEntity<UsageEventResponse> recordUsage(
            @PathVariable UUID projectId,
            @Valid @RequestBody UsageEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(analyticsService.recordUsage(projectId, request));
    }

    /**
     * month dạng yyyy-MM; không hợp lệ thì BE tự lấy tháng hiện tại.
     */
    private YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return null;
        }
        try {
            return YearMonth.parse(month.trim());
        } catch (RuntimeException exception) {
            return null;
        }
    }
}
