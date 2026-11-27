package com.knowledgehub.entity;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Catalog model tĩnh cho từng provider. DB chỉ lưu model id; catalog cung cấp
 * nhãn, context window và default để UI/Resolver dùng thống nhất.
 */
public enum ProviderModel {
    FPT_DEEPSEEK_V3(ProviderType.FPT_CLOUD, "deepseek-v3", "DeepSeek V3", Kind.CHAT, 128_000, true),
    FPT_QWEN3_32B(ProviderType.FPT_CLOUD, "qwen3-32b", "Qwen3 32B", Kind.CHAT, 32_000, false),

    OPENAI_GPT_4O_MINI(ProviderType.OPENAI, "gpt-4o-mini", "GPT-4o mini", Kind.CHAT, 128_000, true),
    OPENAI_GPT_4O(ProviderType.OPENAI, "gpt-4o", "GPT-4o", Kind.CHAT, 128_000, false),
    OPENAI_EMBEDDING_SMALL(ProviderType.OPENAI, "text-embedding-3-small",
            "text-embedding-3-small", Kind.EMBEDDING, 8_191, true),

    ANTHROPIC_CLAUDE_SONNET(ProviderType.ANTHROPIC, "claude-sonnet-4-5",
            "Claude Sonnet 4.5", Kind.CHAT, 200_000, true),
    ANTHROPIC_CLAUDE_HAIKU(ProviderType.ANTHROPIC, "claude-haiku-4-5",
            "Claude Haiku 4.5", Kind.CHAT, 200_000, false),

    GOOGLE_GEMINI_FLASH(ProviderType.GOOGLE, "gemini-2.5-flash",
            "Gemini 2.5 Flash", Kind.CHAT, 1_000_000, true),
    GOOGLE_GEMINI_PRO(ProviderType.GOOGLE, "gemini-2.5-pro",
            "Gemini 2.5 Pro", Kind.CHAT, 1_000_000, false),
    GOOGLE_EMBEDDING(ProviderType.GOOGLE, "text-embedding-004",
            "Gemini text-embedding-004", Kind.EMBEDDING, 2_048, true);

    public enum Kind {
        CHAT,
        EMBEDDING
    }

    private final ProviderType provider;
    private final String id;
    private final String label;
    private final Kind kind;
    private final int contextWindow;
    private final boolean defaultModel;

    ProviderModel(
            ProviderType provider,
            String id,
            String label,
            Kind kind,
            int contextWindow,
            boolean defaultModel) {
        this.provider = provider;
        this.id = id;
        this.label = label;
        this.kind = kind;
        this.contextWindow = contextWindow;
        this.defaultModel = defaultModel;
    }

    public ProviderType getProvider() {
        return provider;
    }

    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public Kind getKind() {
        return kind;
    }

    public int getContextWindow() {
        return contextWindow;
    }

    public boolean isDefaultModel() {
        return defaultModel;
    }

    public static List<ProviderModel> forProvider(ProviderType provider, Kind kind) {
        return Arrays.stream(values())
                .filter(model -> model.provider == provider && model.kind == kind)
                .toList();
    }

    public static List<ProviderModel> forProvider(ProviderType provider) {
        return Arrays.stream(values())
                .filter(model -> model.provider == provider)
                .toList();
    }

    public static Optional<ProviderModel> find(ProviderType provider, String modelId) {
        if (provider == null || modelId == null || modelId.isBlank()) {
            return Optional.empty();
        }
        String normalized = modelId.trim();
        return Arrays.stream(values())
                .filter(model -> model.provider == provider && model.id.equalsIgnoreCase(normalized))
                .findFirst();
    }

    public static String defaultChatModel(ProviderType provider) {
        return Arrays.stream(values())
                .filter(model -> model.provider == provider && model.kind == Kind.CHAT && model.defaultModel)
                .map(ProviderModel::getId)
                .findFirst()
                .orElse(null);
    }

    public static String defaultEmbeddingModel(ProviderType provider) {
        return Arrays.stream(values())
                .filter(model -> model.provider == provider && model.kind == Kind.EMBEDDING && model.defaultModel)
                .map(ProviderModel::getId)
                .findFirst()
                .orElse(null);
    }

    /**
     * Model do client gửi lên: bỏ trống → default; có giá trị lạ vẫn được chấp
     * nhận (deployment có thể dùng model mới trước khi cập nhật catalog).
     */
    public static String resolveChatModel(ProviderType provider, String requested) {
        if (requested != null && !requested.isBlank()) {
            return requested.trim();
        }
        return defaultChatModel(provider);
    }
}
