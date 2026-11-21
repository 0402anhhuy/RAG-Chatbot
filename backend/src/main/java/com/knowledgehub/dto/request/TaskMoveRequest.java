package com.knowledgehub.dto.request;

import com.knowledgehub.entity.TaskStatus;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Kéo một task sang cột khác (hoặc lên vị trí mới trong cùng cột). sortKey là
 * thứ tự client đang hiển thị, dùng để đặt task vào đúng chỗ.
 */
public record TaskMoveRequest(
        @NotNull
        TaskStatus status,
        Long sortKey,
        Integer sortOrder,
        UUID afterTaskId) {

}
