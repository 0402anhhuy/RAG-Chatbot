package com.knowledgehub.dto.request;

import com.knowledgehub.entity.ProviderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Thêm key LLM cho project (Settings → LLM + Budget → Add Provider).
 *
 * @param endpointCode mã endpoint trong danh sách cố định của provider, bỏ
 * trống thì dùng endpoint đầu tiên
 */
public record ProjectLlmCredentialRequest(
        @NotNull(message = "provider is required")
        ProviderType provider,
        @NotBlank(message = "API key is required")
        @Size(max = 500)
        String apiKey,
        String endpointCode,
        @Size(max = 120)
        String model) {

}
