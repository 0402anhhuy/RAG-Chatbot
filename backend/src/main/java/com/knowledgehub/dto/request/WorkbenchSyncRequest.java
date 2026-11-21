package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Nội dung một file gửi lên khi sync workspace (cả hai chiều upload/download
 * đều dùng cùng một cấu trúc để FE và BE hiểu giống nhau).
 */
public record WorkbenchSyncRequest(
        @NotBlank(message = "path is required")
        String path,
        String content) {

}
