package com.knowledgehub.service.impl;

import com.knowledgehub.dto.response.ResolvedProviderResponse;
import com.knowledgehub.entity.ProjectLlmCredential;
import com.knowledgehub.entity.ProjectSetting;
import com.knowledgehub.entity.ProviderEndpoint;
import com.knowledgehub.entity.ProviderModel;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.UserLlmProvider;
import com.knowledgehub.repository.ProjectLlmCredentialRepository;
import com.knowledgehub.repository.ProjectSettingRepository;
import com.knowledgehub.repository.UserLlmProviderRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.ProviderCredentialResolver;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Thứ tự chọn credential: key của project → key cá nhân của user (nếu project
 * cho phép) → platform default. Kết quả được cache ngắn để không query DB mỗi
 * lượt chat.
 */
@Service
public class ProviderCredentialResolverImpl implements ProviderCredentialResolver {

    private static final Logger log = LoggerFactory.getLogger(ProviderCredentialResolverImpl.class);
    private static final String PURPOSE_CHAT = "chat";
    private static final String PURPOSE_EMBEDDING = "embedding";

    private final ProjectLlmCredentialRepository projectCredentialRepository;
    private final UserLlmProviderRepository userProviderRepository;
    private final ProjectSettingRepository projectSettingRepository;
    private final Duration cacheTtl;
    private final Map<CacheKey, CachedValue> cache = new ConcurrentHashMap<>();

    private final ProviderType platformProvider;
    private final String platformApiKey;
    private final String platformEndpointCode;
    private final String platformModel;

    public ProviderCredentialResolverImpl(
            ProjectLlmCredentialRepository projectCredentialRepository,
            UserLlmProviderRepository userProviderRepository,
            ProjectSettingRepository projectSettingRepository,
            @Value("${app.provider-cache-ttl:PT60S}") Duration cacheTtl,
            @Value("${app.platform.provider:}") String platformProvider,
            @Value("${app.platform.api-key:}") String platformApiKey,
            @Value("${app.platform.endpoint-code:}") String platformEndpointCode,
            @Value("${app.platform.model:}") String platformModel) {
        this.projectCredentialRepository = projectCredentialRepository;
        this.userProviderRepository = userProviderRepository;
        this.projectSettingRepository = projectSettingRepository;
        this.cacheTtl = cacheTtl;
        this.platformProvider = parseProvider(platformProvider);
        this.platformApiKey = platformApiKey;
        this.platformEndpointCode = platformEndpointCode;
        this.platformModel = platformModel;
    }

    @Override
    public ResolvedProviderResponse resolve(UUID projectId, UUID userId, String purpose) {
        String normalizedPurpose = normalizePurpose(purpose);
        CacheKey key = new CacheKey(projectId, userId, normalizedPurpose);
        CachedValue cached = cache.get(key);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.value();
        }
        ResolvedProviderResponse resolved = doResolve(projectId, userId, normalizedPurpose);
        cache.put(key, new CachedValue(resolved, Instant.now().plus(cacheTtl)));
        return resolved;
    }

    @Override
    public void invalidate(UUID projectId, UUID userId) {
        cache.entrySet().removeIf(entry -> {
            CacheKey key = entry.getKey();
            boolean projectMatches = projectId != null && projectId.equals(key.projectId());
            boolean userMatches = userId != null && userId.equals(key.userId());
            return projectMatches || userMatches;
        });
    }

    private ResolvedProviderResponse doResolve(UUID projectId, UUID userId, String purpose) {
        if (projectId != null) {
            List<ProjectLlmCredential> credentials =
                    projectCredentialRepository.findByProjectIdOrderByProviderTypeAsc(projectId);
            if (!credentials.isEmpty()) {
                ProjectLlmCredential credential = credentials.get(0);
                return build(
                        credential.getProviderType(),
                        credential.getEndpointCode(),
                        credential.getModel(),
                        credential.getApiKey(),
                        purpose);
            }
        }

        if (userId != null && personalProvidersAllowed(projectId)) {
            List<UserLlmProvider> providers =
                    userProviderRepository.findByUserIdOrderByProviderTypeAsc(userId);
            if (!providers.isEmpty()) {
                UserLlmProvider provider = providers.get(0);
                return build(
                        provider.getProviderType(),
                        provider.getEndpointCode(),
                        provider.getModel(),
                        provider.getApiKey(),
                        purpose);
            }
        }

        if (platformProvider != null && platformApiKey != null && !platformApiKey.isBlank()) {
            return build(platformProvider, platformEndpointCode, platformModel, platformApiKey, purpose);
        }

        log.debug("No provider credential configured for project={} user={}", projectId, userId);
        throw new ServiceEntityNotFoundException(
                "No LLM provider is configured for this project or user");
    }

    private ResolvedProviderResponse build(
            ProviderType provider,
            String endpointCode,
            String storedModel,
            String apiKey,
            String purpose) {
        ProviderEndpoint endpoint = endpoint(provider, endpointCode);
        String model = PURPOSE_EMBEDDING.equals(purpose)
                ? ProviderModel.defaultEmbeddingModel(provider)
                : ProviderModel.resolveChatModel(provider, storedModel);
        if (model == null || model.isBlank()) {
            throw new IllegalStateException(
                    "Provider " + provider + " has no " + purpose + " model in the catalog");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Provider credential has no API key");
        }
        return new ResolvedProviderResponse(
                provider,
                label(provider),
                endpoint != null ? endpoint.name() : null,
                endpoint != null ? endpoint.getBaseUrl() : null,
                model,
                apiKey,
                purpose,
                PURPOSE_EMBEDDING.equals(purpose) ? List.of("embedding") : List.of("chat", "streaming"));
    }

    private boolean personalProvidersAllowed(UUID projectId) {
        if (projectId == null) {
            return true;
        }
        Optional<ProjectSetting> setting = projectSettingRepository.findByProjectId(projectId);
        return setting.map(ProjectSetting::isAllowPersonalProviders).orElse(true);
    }

    private ProviderEndpoint endpoint(ProviderType provider, String endpointCode) {
        if (endpointCode != null && !endpointCode.isBlank()) {
            ProviderEndpoint endpoint = ProviderEndpoint.fromCode(endpointCode);
            if (endpoint != null && endpoint.getProviderType().equals(provider.name())) {
                return endpoint;
            }
        }
        return Arrays.stream(ProviderEndpoint.values())
                .filter(candidate -> candidate.getProviderType().equals(provider.name()))
                .findFirst()
                .orElse(null);
    }

    private static String normalizePurpose(String purpose) {
        if (purpose == null || purpose.isBlank()) {
            return PURPOSE_CHAT;
        }
        String normalized = purpose.trim().toLowerCase();
        if (!PURPOSE_CHAT.equals(normalized) && !PURPOSE_EMBEDDING.equals(normalized)) {
            throw new IllegalArgumentException("purpose must be 'chat' or 'embedding'");
        }
        return normalized;
    }

    private static ProviderType parseProvider(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return ProviderType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("Unknown app.platform.provider: " + value, exception);
        }
    }

    private static String label(ProviderType providerType) {
        return switch (providerType) {
            case FPT_CLOUD -> "FPT Smart Cloud";
            case OPENAI -> "OpenAI";
            case ANTHROPIC -> "Anthropic Claude";
            case GOOGLE -> "Google Gemini";
        };
    }

    private record CacheKey(UUID projectId, UUID userId, String purpose) {
    }

    private record CachedValue(ResolvedProviderResponse value, Instant expiresAt) {
    }
}
