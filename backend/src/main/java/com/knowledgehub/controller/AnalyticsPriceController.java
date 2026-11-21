package com.knowledgehub.controller;

import com.knowledgehub.dto.request.ProviderModelPriceRequest;
import com.knowledgehub.dto.response.ProviderModelPriceResponse;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.service.interfaces.AnalyticsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Đơn giá token theo provider/model — nguồn để quy token ra tiền cho Analytics.
 * Không gắn với project nào nên đặt ở một controller riêng.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analytics/prices")
public class AnalyticsPriceController {

    private final AnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<List<ProviderModelPriceResponse>> listPrices(
            @RequestParam(required = false) ProviderType provider) {
        return ResponseEntity.ok(analyticsService.listPrices(provider));
    }

    @PutMapping("/{provider}")
    public ResponseEntity<ProviderModelPriceResponse> upsertPrice(
            @PathVariable ProviderType provider,
            @Valid @RequestBody ProviderModelPriceRequest request) {
        return ResponseEntity.ok(analyticsService.upsertPrice(provider, request));
    }
}
