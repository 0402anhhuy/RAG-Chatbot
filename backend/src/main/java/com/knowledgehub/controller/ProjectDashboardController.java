package com.knowledgehub.controller;

import com.knowledgehub.dto.response.ProjectDashboardResponse;
import com.knowledgehub.service.interfaces.ProjectSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Số liệu KPI cho tab Dashboard của project (members, tasks, completed today và
 * My Tasks của người đang xem).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects/{projectId}/dashboard")
public class ProjectDashboardController {

    private final ProjectSettingService projectSettingService;

    @GetMapping
    public ResponseEntity<ProjectDashboardResponse> getDashboard(
            @PathVariable UUID projectId,
            @RequestParam(required = false) UUID viewerId) {
        return ResponseEntity.ok(projectSettingService.getDashboard(projectId, viewerId));
    }
}
