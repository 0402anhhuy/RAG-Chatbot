package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ChatSessionUpdateRequest(
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        String title,
        UUID projectId,
        @Size(max = 120, message = "Tên model tối đa 120 ký tự")
        String model,
        Boolean bookmarked
        ) {

}
