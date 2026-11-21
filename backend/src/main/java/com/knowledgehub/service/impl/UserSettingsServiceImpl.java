package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.UserLlmProviderUpsertRequest;
import com.knowledgehub.dto.request.UserSettingUpdateRequest;
import com.knowledgehub.dto.response.StarterKitUsageResponse;
import com.knowledgehub.dto.response.UserLlmProviderResponse;
import com.knowledgehub.dto.response.UserSettingsResponse;
import com.knowledgehub.entity.ProviderEndpoint;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.UserLlmProvider;
import com.knowledgehub.entity.UserSetting;
import com.knowledgehub.repository.UserLlmProviderRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.repository.UserSettingRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.UserSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class UserSettingsServiceImpl implements UserSettingsService {

    private static final BigDecimal DEFAULT_STARTER_KIT_LIMIT = new BigDecimal("50.00");
    private static final int DEFAULT_RESET_DAY = 1;

    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;
    private final UserLlmProviderRepository userLlmProviderRepository;

    @Override
    @Transactional(readOnly = true)
    public UserSettingsResponse getSettings(UUID userId) {
        UserSetting setting = findSetting(userId);
        return buildResponse(userId, setting);
    }

    @Override
    public UserSettingsResponse updateSettings(UUID userId, UserSettingUpdateRequest request) {
        requireUser(userId);
        UserSetting setting = findSetting(userId);
        setting.setStarterKitMonthlyLimit(request.starterKitMonthlyLimit());
        if (request.budgetResetDay() != null) {
            setting.setBudgetResetDay(request.budgetResetDay());
        }
        return buildResponse(userId, userSettingRepository.save(setting));
    }

    @Override
    public UserLlmProviderResponse connectProvider(
            UUID userId, ProviderType providerType, UserLlmProviderUpsertRequest request) {
        requireUser(userId);
        if (providerType == null) {
            throw new IllegalArgumentException("provider is required");
        }

        String apiKey = request.apiKey() == null ? "" : request.apiKey().trim();
        if (apiKey.isEmpty()) {
            throw new IllegalArgumentException("API key is required");
        }

        ProviderEndpoint endpoint = resolveEndpoint(providerType, request.endpointCode());

        UserLlmProvider provider = userLlmProviderRepository
                .findByUserIdAndProviderType(userId, providerType)
                .orElseGet(() -> {
                    UserLlmProvider created = new UserLlmProvider();
                    created.setUserId(userId);
                    created.setProviderType(providerType);
                    return created;
                });

        provider.setApiKey(apiKey);
        provider.setEndpointCode(endpoint.name());
        return UserLlmProviderResponse.fromEntity(userLlmProviderRepository.save(provider));
    }

    @Override
    public void disconnectProvider(UUID userId, ProviderType providerType) {
        userLlmProviderRepository.findByUserIdAndProviderType(userId, providerType)
                .ifPresent(userLlmProviderRepository::delete);
    }

    private UserSettingsResponse buildResponse(UUID userId, UserSetting setting) {
        Map<ProviderType, UserLlmProvider> connectedProviders = new EnumMap<>(ProviderType.class);
        userLlmProviderRepository.findByUserIdOrderByProviderTypeAsc(userId)
                .forEach(provider -> connectedProviders.put(provider.getProviderType(), provider));

        List<UserLlmProviderResponse> providers = Arrays.stream(ProviderType.values())
                .map(providerType -> connectedProviders.containsKey(providerType)
                        ? UserLlmProviderResponse.fromEntity(connectedProviders.get(providerType))
                        : UserLlmProviderResponse.disconnected(providerType))
                .toList();

        // Chưa có bảng tracking usage theo user nên số đã tiêu trong chu kỳ là 0.
        BigDecimal spent = BigDecimal.ZERO;

        return new UserSettingsResponse(
                userId,
                StarterKitUsageResponse.of(
                        spent, setting.getStarterKitMonthlyLimit(), setting.getBudgetResetDay(), LocalDate.now()),
                providers,
                UserSettingsResponse.ProviderEndpointResponse.all());
    }

    private UserSetting findSetting(UUID userId) {
        requireUser(userId);
        return userSettingRepository.findByUserId(userId).orElseGet(() -> {
            UserSetting setting = new UserSetting();
            setting.setUserId(userId);
            setting.setStarterKitMonthlyLimit(DEFAULT_STARTER_KIT_LIMIT);
            setting.setBudgetResetDay(DEFAULT_RESET_DAY);
            return setting;
        });
    }

    private void requireUser(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (!userRepository.existsById(userId)) {
            throw new ServiceEntityNotFoundException("User not found: " + userId);
        }
    }

    private ProviderEndpoint resolveEndpoint(ProviderType providerType, String endpointCode) {
        List<ProviderEndpoint> endpointsOfType = Arrays.stream(ProviderEndpoint.values())
                .filter(endpoint -> endpoint.getProviderType().equals(providerType.name()))
                .toList();

        if (endpointsOfType.isEmpty()) {
            throw new IllegalArgumentException("Provider has no configured endpoint: " + providerType);
        }

        if (endpointCode == null || endpointCode.isBlank()) {
            return endpointsOfType.get(0);
        }

        ProviderEndpoint endpoint = ProviderEndpoint.fromCode(endpointCode);
        if (endpoint == null || !endpoint.getProviderType().equals(providerType.name())) {
            throw new IllegalArgumentException("Endpoint does not belong to provider: " + endpointCode);
        }
        return endpoint;
    }
}
