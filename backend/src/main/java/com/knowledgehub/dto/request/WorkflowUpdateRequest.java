package com.knowledgehub.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cập nhật workflow tự tạo. Workflow BUILT_IN không cho sửa.
 */
public record WorkflowUpdateRequest(
        @Size(min = 1, max = 150, message = "name phải từ 1 đến 150 ký tự")
        String name,
        @Size(max = 2000, message = "description tối đa 2000 ký tự")
        String description,
        @Pattern(regexp = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", message = "color phải là mã màu hex")
        String color,
        @Size(max = 40)
        String iconKey) {

}
