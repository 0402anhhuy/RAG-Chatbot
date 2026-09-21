package com.knowledgehub.dto.request;

import com.knowledgehub.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank(message = "Tên không được để trống")
        @Size(max = 120, message = "Tên tối đa 120 ký tự")
        String name,

        @Pattern(regexp = "^(84|0[3|5|7|8|9])+([0-9]{8})$", message = "Số điện thoại không đúng định dạng")
        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        String phone,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 8, max = 100, message = "Mật khẩu từ 8 đến 100 ký tự")
        String password,

        UserRole role
) {}