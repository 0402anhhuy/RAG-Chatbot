package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.response.ResolvedProviderResponse;

import java.util.UUID;

/**
 * Chọn provider/model/key theo thứ tự project → user → platform.
 */
public interface ProviderCredentialResolver {

    ResolvedProviderResponse resolve(UUID projectId, UUID userId, String purpose);

    void invalidate(UUID projectId, UUID userId);
}
