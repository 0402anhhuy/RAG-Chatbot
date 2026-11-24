package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.response.AdminDashboardResponse;
import com.knowledgehub.dto.response.AdminUserPageResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.UserRole;
import java.util.UUID;

/**
 * Nghiệp vụ dành cho Admin: tổng quan nền tảng và quản lý người dùng.
 */
public interface AdminService {

    AdminDashboardResponse getDashboard(int days);

    AdminUserPageResponse searchUsers(String search, UserRole role, Boolean active, int page, int size);

    UserResponse setUserRole(UUID userId, UserRole role, UUID actingAdminId);

    UserResponse setUserActive(UUID userId, boolean active, UUID actingAdminId);
}
