package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProviderType;

import java.util.List;
import java.util.UUID;

/**
 * Toàn bộ cấu hình thanh prompt của tab IDE cho một conversation.
 *
 * @param agentId agent đang chọn (null = None)
 * @param workflowId workflow đang chọn (null = None)
 * @param skillMode Auto | Manual
 */
public record WorkbenchSettingsResponse(
        UUID conversationId,
        UUID agentId,
        UUID workflowId,
        ProviderType provider,
        String model,
        String skillMode,
        boolean autoApprove,
        boolean hideThinking,
        List<Option> agents,
        List<Option> workflows,
        List<ModelOption> models) {

    public record Option(UUID id, String name, String color, String meta) {

    }

    public record ModelOption(ProviderType provider, String model, String label, boolean connected) {

    }
}
