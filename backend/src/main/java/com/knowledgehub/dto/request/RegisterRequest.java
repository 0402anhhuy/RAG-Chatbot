package com.knowledgehub.dto.request;

import com.knowledgehub.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 120, message = "Full name must be at most 120 characters")
        String name,

        @Pattern(regexp = "^$|^(84|0[3|5|7|8|9])+([0-9]{8})$", message = "Invalid phone number format")
        @Size(max = 20, message = "Phone must be at most 20 characters")
        String phone,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Email must be at most 255 characters")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        String password,

        UserRole role
) {}