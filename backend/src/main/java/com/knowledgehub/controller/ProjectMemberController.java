package com.knowledgehub.controller;

import com.knowledgehub.dto.request.ProjectMemberAddRequest;
import com.knowledgehub.dto.request.ProjectMemberRoleUpdateRequest;
import com.knowledgehub.dto.response.ProjectMemberDetailResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.service.interfaces.ProjectMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects/{projectId}/members")
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;

    @GetMapping
    public ResponseEntity<List<ProjectMemberDetailResponse>> getByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectMemberService.getByProject(projectId));
    }

    /**
     * Tài khoản có thể thêm vào project (loại bỏ những người đã là member).
     */
    @GetMapping("/candidates")
    public ResponseEntity<List<UserResponse>> searchCandidates(
            @PathVariable UUID projectId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(projectMemberService.searchCandidates(projectId, search));
    }

    @PostMapping
    public ResponseEntity<ProjectMemberDetailResponse> add(
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectMemberAddRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectMemberService.add(projectId, request));
    }

    @PatchMapping("/{memberId}")
    public ResponseEntity<ProjectMemberDetailResponse> updateRole(
            @PathVariable UUID projectId,
            @PathVariable UUID memberId,
            @Valid @RequestBody ProjectMemberRoleUpdateRequest request) {
        return ResponseEntity.ok(projectMemberService.updateRole(projectId, memberId, request.role()));
    }

    @DeleteMapping("/{memberId}")
    public ResponseEntity<Void> remove(
            @PathVariable UUID projectId,
            @PathVariable UUID memberId) {
        projectMemberService.remove(projectId, memberId);
        return ResponseEntity.noContent().build();
    }
}
