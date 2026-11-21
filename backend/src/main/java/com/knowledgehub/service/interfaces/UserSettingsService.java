package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.UserLlmProviderUpsertRequest;
import com.knowledgehub.dto.request.UserSettingUpdateRequest;
import com.knowledgehub.dto.response.UserLlmProviderResponse;
import com.knowledgehub.dto.response.UserSettingsResponse;
import com.knowledgehub.entity.ProviderType;

import java.util.UUID;

public interface UserSettingsService {

    UserSettingsResponse getSettings(UUID userId);

    UserSettingsResponse updateSettings(UUID userId, UserSettingUpdateRequest request);

    UserLlmProviderResponse connectProvider(UUID userId, ProviderType providerType, UserLlmProviderUpsertRequest request);

    void disconnectProvider(UUID userId, ProviderType providerType);
}
