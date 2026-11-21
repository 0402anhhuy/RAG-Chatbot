package com.knowledgehub.controller;

import com.knowledgehub.dto.request.ProjectLlmCredentialRequest;
import com.knowledgehub.dto.request.ProjectSettingUpdateRequest;
import com.knowledgehub.dto.response.ArchivedTaskResponse;
import com.knowledgehub.dto.response.ProjectSettingResponse;
import com.knowledgehub.service.interfaces.ProjectSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Tab Settings của một project: thông tin chung, LLM provider + budget và danh
 * sách task đã archive.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects/{projectId}/settings")
public class ProjectSettingController {

    private final ProjectSettingService projectSettingService;

    @GetMapping
    public ResponseEntity<ProjectSettingResponse> getSettings(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectSettingService.getSettings(projectId));
    }

    @PatchMapping
    public ResponseEntity<ProjectSettingResponse> updateSettings(
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectSettingUpdateRequest request) {
        return ResponseEntity.ok(projectSettingService.updateSettings(projectId, request));
    }

    /**
     * "Add & Verify" — lưu key cho provider và trả lại toàn bộ settings.
     */
    @PostMapping("/providers")
    public ResponseEntity<ProjectSettingResponse> addProvider(
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectLlmCredentialRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectSettingService.addProvider(projectId, request));
    }

    @DeleteMapping("/providers/{credentialId}")
    public ResponseEntity<ProjectSettingResponse> removeProvider(
            @PathVariable UUID projectId,
            @PathVariable UUID credentialId) {
        return ResponseEntity.ok(projectSettingService.removeProvider(projectId, credentialId));
    }

    @GetMapping("/archived-tasks")
    public ResponseEntity<List<ArchivedTaskResponse>> listArchivedTasks(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectSettingService.listArchivedTasks(projectId));
    }

    /**
     * Nút Unarchive trong tab Archived.
     */
    @PostMapping("/archived-tasks/{taskId}/restore")
    public ResponseEntity<Void> unarchiveTask(
            @PathVariable UUID projectId,
            @PathVariable UUID taskId) {
        projectSettingService.unarchiveTask(projectId, taskId);
        return ResponseEntity.noContent().build();
    }
}
