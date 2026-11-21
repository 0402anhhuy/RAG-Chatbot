package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProviderEndpoint;

import java.util.List;
import java.util.UUID;

public record UserSettingsResponse(
        UUID userId,
        StarterKitUsageResponse starterKitUsage,
        List<UserLlmProviderResponse> llmProviders,
        List<ProviderEndpointResponse> availableEndpoints) {

    public record ProviderEndpointResponse(String code, String label, String host, String baseUrl) {

        public static List<ProviderEndpointResponse> all() {
            return java.util.Arrays.stream(ProviderEndpoint.values())
                    .map(endpoint -> new ProviderEndpointResponse(
                            endpoint.name(), endpoint.getLabel(), endpoint.getHost(), endpoint.getBaseUrl()))
                    .toList();
        }
    }
}
