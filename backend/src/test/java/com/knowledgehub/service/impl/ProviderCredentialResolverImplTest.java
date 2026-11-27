package com.knowledgehub.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.knowledgehub.dto.response.ResolvedProviderResponse;
import com.knowledgehub.entity.ProjectLlmCredential;
import com.knowledgehub.entity.ProjectSetting;
import com.knowledgehub.entity.ProviderEndpoint;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.UserLlmProvider;
import com.knowledgehub.repository.ProjectLlmCredentialRepository;
import com.knowledgehub.repository.ProjectSettingRepository;
import com.knowledgehub.repository.UserLlmProviderRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProviderCredentialResolverImplTest {

    private final ProjectLlmCredentialRepository projectRepo = mock(ProjectLlmCredentialRepository.class);
    private final UserLlmProviderRepository userRepo = mock(UserLlmProviderRepository.class);
    private final ProjectSettingRepository settingRepo = mock(ProjectSettingRepository.class);

    private ProviderCredentialResolverImpl resolver(String platformProvider, String platformKey) {
        return new ProviderCredentialResolverImpl(
                projectRepo,
                userRepo,
                settingRepo,
                Duration.ofSeconds(60),
                platformProvider,
                platformKey,
                "",
                "");
    }

    @Test
    void prefersProjectCredential() {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        ProjectLlmCredential credential = new ProjectLlmCredential();
        credential.setProviderType(ProviderType.OPENAI);
        credential.setEndpointCode(ProviderEndpoint.OPENAI_STANDARD.name());
        credential.setApiKey("sk-project");
        when(projectRepo.findByProjectIdOrderByProviderTypeAsc(projectId)).thenReturn(List.of(credential));

        ResolvedProviderResponse resolved = resolver("", "").resolve(projectId, userId, "chat");

        assertEquals(ProviderType.OPENAI, resolved.provider());
        assertEquals("gpt-4o-mini", resolved.model());
        assertEquals("https://api.openai.com/v1", resolved.baseUrl());
        assertEquals("sk-project", resolved.apiKey());
    }

    @Test
    void fallsBackToUserProviderWhenProjectAllows() {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        ProjectSetting setting = new ProjectSetting();
        setting.setAllowPersonalProviders(true);
        UserLlmProvider provider = new UserLlmProvider();
        provider.setProviderType(ProviderType.ANTHROPIC);
        provider.setEndpointCode(ProviderEndpoint.ANTHROPIC_STANDARD.name());
        provider.setApiKey("sk-user");
        when(projectRepo.findByProjectIdOrderByProviderTypeAsc(projectId)).thenReturn(List.of());
        when(settingRepo.findByProjectId(projectId)).thenReturn(Optional.of(setting));
        when(userRepo.findByUserIdOrderByProviderTypeAsc(userId)).thenReturn(List.of(provider));

        ResolvedProviderResponse resolved = resolver("", "").resolve(projectId, userId, "chat");

        assertEquals(ProviderType.ANTHROPIC, resolved.provider());
        assertEquals("claude-sonnet-4-5", resolved.model());
    }

    @Test
    void blocksPersonalProviderWhenProjectDisallows() {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        ProjectSetting setting = new ProjectSetting();
        setting.setAllowPersonalProviders(false);
        when(projectRepo.findByProjectIdOrderByProviderTypeAsc(projectId)).thenReturn(List.of());
        when(settingRepo.findByProjectId(projectId)).thenReturn(Optional.of(setting));

        assertThrows(ServiceEntityNotFoundException.class,
                () -> resolver("", "").resolve(projectId, userId, "chat"));
    }

    @Test
    void usesPlatformFallback() {
        ResolvedProviderResponse resolved = resolver("OPENAI", "sk-platform")
                .resolve(null, null, "chat");

        assertEquals(ProviderType.OPENAI, resolved.provider());
        assertEquals("gpt-4o-mini", resolved.model());
    }

    @Test
    void cachesUntilInvalidated() {
        UUID projectId = UUID.randomUUID();
        ProjectLlmCredential credential = new ProjectLlmCredential();
        credential.setProviderType(ProviderType.GOOGLE);
        credential.setEndpointCode(ProviderEndpoint.GOOGLE_GEMINI.name());
        credential.setApiKey("sk-google");
        when(projectRepo.findByProjectIdOrderByProviderTypeAsc(projectId)).thenReturn(List.of(credential));
        ProviderCredentialResolverImpl resolver = resolver("", "");

        resolver.resolve(projectId, null, "chat");
        resolver.resolve(projectId, null, "chat");
        verify(projectRepo, times(1)).findByProjectIdOrderByProviderTypeAsc(projectId);

        resolver.invalidate(projectId, null);
        resolver.resolve(projectId, null, "chat");
        verify(projectRepo, times(2)).findByProjectIdOrderByProviderTypeAsc(projectId);
    }

    @Test
    void embeddingPurposeUsesEmbeddingModel() {
        UUID projectId = UUID.randomUUID();
        ProjectLlmCredential credential = new ProjectLlmCredential();
        credential.setProviderType(ProviderType.OPENAI);
        credential.setEndpointCode(ProviderEndpoint.OPENAI_STANDARD.name());
        credential.setApiKey("sk-project");
        when(projectRepo.findByProjectIdOrderByProviderTypeAsc(projectId)).thenReturn(List.of(credential));

        ResolvedProviderResponse resolved = resolver("", "").resolve(projectId, null, "embedding");

        assertEquals("text-embedding-3-small", resolved.model());
        assertEquals(List.of("embedding"), resolved.capabilities());
    }
}
