package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.ProviderModelPriceRequest;
import com.knowledgehub.dto.request.UsageEventRequest;
import com.knowledgehub.dto.response.ProjectAnalyticsResponse;
import com.knowledgehub.dto.response.ProviderModelPriceResponse;
import com.knowledgehub.dto.response.UsageEventResponse;
import com.knowledgehub.entity.ProviderType;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

public interface AnalyticsService {

    /**
     * Số liệu tab Analytics của project trong tháng (null = tháng hiện tại).
     */
    ProjectAnalyticsResponse getProjectAnalytics(UUID projectId, YearMonth month);

    UsageEventResponse recordUsage(UUID projectId, UsageEventRequest request);

    List<ProviderModelPriceResponse> listPrices(ProviderType provider);

    ProviderModelPriceResponse upsertPrice(ProviderType provider, ProviderModelPriceRequest request);
}
