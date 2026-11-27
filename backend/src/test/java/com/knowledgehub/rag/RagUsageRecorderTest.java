package com.knowledgehub.rag;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.knowledgehub.dto.request.UsageEventRequest;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.service.interfaces.AnalyticsService;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class RagUsageRecorderTest {

    @Test
    void recordsProviderUsageTokens() {
        AnalyticsService analytics = mock(AnalyticsService.class);
        RagUsageRecorder recorder = new RagUsageRecorder(analytics);
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Map<String, Object> response = Map.of("usage", Map.of(
                "provider", "openai",
                "model", "gpt-4o-mini",
                "prompt_tokens", 120,
                "completion_tokens", 30,
                "cache_read_tokens", 4,
                "cache_write_tokens", 2));

        recorder.record(projectId, userId, response);

        ArgumentCaptor<UsageEventRequest> captor = ArgumentCaptor.forClass(UsageEventRequest.class);
        verify(analytics).recordUsage(eq(projectId), captor.capture());
        UsageEventRequest request = captor.getValue();
        assertEquals(ProviderType.OPENAI, request.provider());
        assertEquals("gpt-4o-mini", request.model());
        assertEquals(120L, request.promptTokens());
        assertEquals(30L, request.completionTokens());
        assertEquals(4L, request.cacheReadTokens());
        assertEquals(2L, request.cacheWriteTokens());
        assertEquals("COMPLETED", request.outcomeStatus());
    }

    @Test
    void skipsUnknownProviderWithoutCallingAnalytics() {
        AnalyticsService analytics = mock(AnalyticsService.class);
        new RagUsageRecorder(analytics).record(
                UUID.randomUUID(),
                null,
                Map.of("usage", Map.of("provider", "mock", "model", "mock")));

        verify(analytics, org.mockito.Mockito.never()).recordUsage(any(), any());
    }
}
