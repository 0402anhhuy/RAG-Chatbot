package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Cập nhật khóa học. Field null = giữ nguyên.
 */
public record CourseUpdateRequest(
        @Size(max = 50)
        String code,
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
        Integer completedLessons,
        @Min(0)
        @Max(100)
        Integer completionThreshold,
        Boolean archived) {

}
