package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Tham gia / tạo khóa học. workspaceId bỏ trống thì BE dùng workspace đầu tiên
 * của owner (Academy Hub chỉ có một workspace học tập).
 */
public record CourseCreateRequest(
        UUID workspaceId,
        @NotBlank(message = "code is required")
        @Size(max = 50)
        String code,
        @NotBlank(message = "title is required")
        @Size(max = 200)
        String title,
        @Size(max = 50)
        String semester,
        @Size(max = 150)
        String instructor,
        @Size(max = 2000)
        String description,
        @Min(0)
        @Max(500)
        Integer totalLessons,
        @Min(0)
        @Max(500)
        Integer completedLessons) {

}
