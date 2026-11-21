package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Chạy một công cụ Studio (summary / flashcards / quiz / mindmap / presentation
 * / datatable) trên các nguồn đang bật.
 */
public record StudyStudioRequest(
        @NotBlank(message = "tool is required")
        String tool) {

}
