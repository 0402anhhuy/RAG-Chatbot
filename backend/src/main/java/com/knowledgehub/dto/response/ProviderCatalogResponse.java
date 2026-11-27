package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProviderEndpoint;
import com.knowledgehub.entity.ProviderModel;
import com.knowledgehub.entity.ProviderType;

import java.util.Arrays;
import java.util.List;

/**
 * Catalog provider/endpoint/model cho UI chọn provider và model.
 */
public record ProviderCatalogResponse(List<ProviderEntry> providers) {

    public record ProviderEntry(
            ProviderType type,
            String label,
            String defaultChatModel,
            List<EndpointEntry> endpoints,
            List<ModelEntry> models) {
    }

    public record EndpointEntry(String code, String label, String host, String baseUrl) {
    }

    public record ModelEntry(String id, String label, String kind, int contextWindow, boolean defaultModel) {
    }

    public static ProviderCatalogResponse all() {
        List<ProviderEntry> providers = Arrays.stream(ProviderType.values())
                .map(provider -> new ProviderEntry(
                        provider,
                        label(provider),
                        ProviderModel.defaultChatModel(provider),
                        Arrays.stream(ProviderEndpoint.values())
                                .filter(endpoint -> endpoint.getProviderType().equals(provider.name()))
                                .map(endpoint -> new EndpointEntry(
                                        endpoint.name(),
                                        endpoint.getLabel(),
                                        endpoint.getHost(),
                                        endpoint.getBaseUrl()))
                                .toList(),
                        ProviderModel.forProvider(provider).stream()
                                .map(model -> new ModelEntry(
                                        model.getId(),
                                        model.getLabel(),
                                        model.getKind().name(),
                                        model.getContextWindow(),
                                        model.isDefaultModel()))
                                .toList()))
                .toList();
        return new ProviderCatalogResponse(providers);
    }

    private static String label(ProviderType providerType) {
        return switch (providerType) {
            case FPT_CLOUD -> "FPT Smart Cloud";
            case OPENAI -> "OpenAI";
            case ANTHROPIC -> "Anthropic Claude";
            case GOOGLE -> "Google Gemini";
        };
    }
}
