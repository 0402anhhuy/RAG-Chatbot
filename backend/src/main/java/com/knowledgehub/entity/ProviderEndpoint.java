package com.knowledgehub.entity;

/**
 * Danh sách endpoint cố định cho từng provider. Mọi endpoint hợp lệ đều nằm ở
 * đây nên database chỉ lưu endpointCode (String).
 */
public enum ProviderEndpoint {
    FPT_CLOUD_VN("FPT_CLOUD", "FPT Cloud VN", "mkp-api.fptcloud.com", "https://mkp-api.fptcloud.com/v1"),
    FPT_CLOUD_GLOBAL("FPT_CLOUD", "FPT Cloud Global", "mkp-api.fptcloud.ai", "https://mkp-api.fptcloud.ai/v1"),
    OPENAI_STANDARD("OPENAI", "OpenAI (api.openai.com)", "api.openai.com", "https://api.openai.com/v1"),
    ANTHROPIC_STANDARD("ANTHROPIC", "Anthropic (api.anthropic.com)", "api.anthropic.com", "https://api.anthropic.com/v1"),
    GOOGLE_GEMINI("GOOGLE", "Google Gemini", "generativelanguage.googleapis.com", "https://generativelanguage.googleapis.com/v1beta");

    private final String providerType;
    private final String label;
    private final String host;
    private final String baseUrl;

    ProviderEndpoint(String providerType, String label, String host, String baseUrl) {
        this.providerType = providerType;
        this.label = label;
        this.host = host;
        this.baseUrl = baseUrl;
    }

    public String getProviderType() {
        return providerType;
    }

    public String getLabel() {
        return label;
    }

    public String getHost() {
        return host;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public static ProviderEndpoint fromCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        for (ProviderEndpoint endpoint : values()) {
            if (endpoint.name().equalsIgnoreCase(code.trim())) {
                return endpoint;
            }
        }
        throw new IllegalArgumentException("Unknown provider endpoint: " + code);
    }
}
