package com.knowledgehub.controller;

import com.knowledgehub.dto.request.UserLlmProviderUpsertRequest;
import com.knowledgehub.dto.request.UserSettingUpdateRequest;
import com.knowledgehub.dto.response.UserLlmProviderResponse;
import com.knowledgehub.dto.response.UserSettingsResponse;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.service.interfaces.UserSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Cấu hình cá nhân của user: hạn mức Starter Kit và API key các LLM provider.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users/{userId}/settings")
public class UserSettingsController {

    private final UserSettingsService userSettingsService;

    @GetMapping
    public ResponseEntity<UserSettingsResponse> getSettings(@PathVariable UUID userId) {
        return ResponseEntity.ok(userSettingsService.getSettings(userId));
    }

    @PatchMapping
    public ResponseEntity<UserSettingsResponse> updateSettings(
            @PathVariable UUID userId,
            @Valid @RequestBody UserSettingUpdateRequest request) {
        return ResponseEntity.ok(userSettingsService.updateSettings(userId, request));
    }

    @PutMapping("/providers/{provider}")
    public ResponseEntity<UserLlmProviderResponse> connectProvider(
            @PathVariable UUID userId,
            @PathVariable ProviderType provider,
            @Valid @RequestBody UserLlmProviderUpsertRequest request) {
        return ResponseEntity.ok(userSettingsService.connectProvider(userId, provider, request));
    }

    @DeleteMapping("/providers/{provider}")
    public ResponseEntity<Void> disconnectProvider(
            @PathVariable UUID userId,
            @PathVariable ProviderType provider) {
        userSettingsService.disconnectProvider(userId, provider);
        return ResponseEntity.noContent().build();
    }
}
