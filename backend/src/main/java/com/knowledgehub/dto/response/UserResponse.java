package com.knowledgehub.dto.response;

import com.knowledgehub.entity.User;
import com.knowledgehub.entity.UserRole;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String phone,
        String email,
        UserRole role,
        boolean active
) {
    public static UserResponse fromEntity(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getPhone(),
                user.getEmail(),
                user.getRole(),
                user.isActive()
        );
    }
}