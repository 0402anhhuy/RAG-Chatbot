package com.knowledgehub.dto.request;

import com.knowledgehub.entity.ProjectMemberRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Thêm thành viên vào project. UI chọn user từ danh sách search nên gửi userId;
 * email để dự phòng cho trường hợp chỉ có email.
 */
public record ProjectMemberAddRequest(
        UUID userId,
        @Email(message = "email không hợp lệ")
        String email,
        @NotNull(message = "role không được để trống")
        ProjectMemberRole role) {

    public boolean hasUser() {
        return userId != null;
    }

    public boolean hasEmail() {
        return email != null && !email.isBlank();
    }
}
