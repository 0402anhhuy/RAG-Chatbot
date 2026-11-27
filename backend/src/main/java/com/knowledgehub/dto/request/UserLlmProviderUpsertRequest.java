package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserLlmProviderUpsertRequest(
        @NotBlank(message = "API key is required")
        @Size(max = 500)
        String apiKey,
        @Size(max = 50)
        String endpointCode,
        @Size(max = 120)
        String model) {

}
