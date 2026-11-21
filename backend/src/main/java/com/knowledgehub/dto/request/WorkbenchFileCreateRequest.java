package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Tạo file mới trong workspace của project.
 *
 * @param path đường dẫn tương đối, vd "src/utils/helper.js"
 * @param content nội dung ban đầu (bỏ trống = file rỗng)
 */
public record WorkbenchFileCreateRequest(
        @NotBlank(message = "path is required")
        @Size(max = 500)
        String path,
        String content) {

}
