package com.knowledgehub.dto.request;

import com.knowledgehub.entity.ProviderType;

import java.util.UUID;

/**
 * Cập nhật thanh prompt của tab IDE. Field null = giữ nguyên giá trị cũ, nên
 * client chỉ gửi đúng thứ vừa đổi.
 *
 * @param clearAgent true để bỏ chọn agent (đưa về None)
 * @param clearWorkflow true để bỏ chọn workflow (đưa về None)
 */
public record WorkbenchSettingsUpdateRequest(
        UUID agentId,
        UUID workflowId,
        ProviderType provider,
        String model,
        String skillMode,
        Boolean autoApprove,
        Boolean hideThinking,
        Boolean clearAgent,
        Boolean clearWorkflow) {

}
