package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record WorkflowCreateRequest(
        @NotBlank(message = "name không được để trống")
        @Size(max = 150, message = "name tối đa 150 ký tự")
        String name,
        @Size(max = 2000, message = "description tối đa 2000 ký tự")
        String description,
        @Pattern(regexp = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", message = "color phải là mã màu hex")
        String color,
        @Size(max = 40)
        String iconKey) {

}
