package com.knowledgehub.controller;

import com.knowledgehub.dto.response.AdminDashboardResponse;
import com.knowledgehub.dto.response.AdminUserPageResponse;
import com.knowledgehub.dto.response.ApiResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.UserRole;
import com.knowledgehub.service.interfaces.AdminService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoint quản trị nền tảng — chỉ ADMIN (được chặn ở SecurityConfig bằng
 * hasRole("ADMIN")). Bao gồm tổng quan hệ thống và quản lý người dùng.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboard(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.<AdminDashboardResponse>builder()
                .success(true)
                .data(adminService.getDashboard(days))
                .build());
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<AdminUserPageResponse>> searchUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.<AdminUserPageResponse>builder()
                .success(true)
                .data(adminService.searchUsers(search, role, active, page, size))
                .build());
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserResponse>> setUserRole(
            @PathVariable UUID id,
            @RequestParam UserRole role,
            @AuthenticationPrincipal User actingAdmin) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Role updated successfully")
                .data(adminService.setUserRole(id, role, actingAdmin.getId()))
                .build());
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<UserResponse>> setUserActive(
            @PathVariable UUID id,
            @RequestParam boolean active,
            @AuthenticationPrincipal User actingAdmin) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Status updated successfully")
                .data(adminService.setUserActive(id, active, actingAdmin.getId()))
                .build());
    }
}
