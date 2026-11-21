package com.knowledgehub.dto.request;

import com.knowledgehub.entity.TaskStatus;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/**
 * Gửi toàn bộ thứ tự của một cột sau khi kéo-thả. Danh sách id chính là thứ tự
 * cuối cùng từ trên xuống dưới.
 */
public record TaskReorderRequest(
        @NotNull
        List<UUID> taskIds,
        @NotNull
        TaskStatus status) {

}
