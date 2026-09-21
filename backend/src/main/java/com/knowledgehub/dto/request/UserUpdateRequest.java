package com.knowledgehub.dto.request;

import com.knowledgehub.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
        @Size(max = 120) String name,
        @Pattern(regexp = "^(84|0[3|5|7|8|9])+([0-9]{8})$", message = "Số điện thoại không đúng định dạng")
        @Size(max = 20) String phone,
        @Email @Size(max = 255) String email,
        @Size(min = 8, max = 100) String password,
        UserRole role
) {}