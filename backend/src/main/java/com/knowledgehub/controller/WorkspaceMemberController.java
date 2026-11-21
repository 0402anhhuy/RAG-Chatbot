package com.knowledgehub.controller;

import com.knowledgehub.dto.request.WorkspaceMemberRequest;
import com.knowledgehub.dto.response.WorkspaceMemberResponse;
import com.knowledgehub.entity.WorkspaceMemberRole;
import com.knowledgehub.entity.User;
import com.knowledgehub.rag.RagWorkspaceAccess;
import com.knowledgehub.service.interfaces.WorkspaceMemberService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceId}/members")
public class WorkspaceMemberController {

    private final WorkspaceMemberService memberService;
    private final RagWorkspaceAccess workspaceAccess;

    @PostMapping
    public ResponseEntity<WorkspaceMemberResponse> add(
            @AuthenticationPrincipal User user,
            @PathVariable UUID workspaceId,
            @Valid @RequestBody WorkspaceMemberRequest request) {
        workspaceAccess.requireWorkspaceOwner(user.getId(), workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberService.add(workspaceId, request));
    }

    @GetMapping
    public ResponseEntity<List<WorkspaceMemberResponse>> getByWorkspace(
            @AuthenticationPrincipal User user,
            @PathVariable UUID workspaceId) {
        workspaceAccess.requireReadAccess(user.getId(), workspaceId, List.of());
        return ResponseEntity.ok(memberService.getByWorkspace(workspaceId));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<WorkspaceMemberResponse> get(
            @AuthenticationPrincipal User user,
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId) {
        workspaceAccess.requireReadAccess(user.getId(), workspaceId, List.of());
        return ResponseEntity.ok(memberService.get(workspaceId, userId));
    }

    @PatchMapping("/{userId}")
    public ResponseEntity<WorkspaceMemberResponse> updateRole(
            @AuthenticationPrincipal User user,
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId,
            @RequestParam WorkspaceMemberRole role) {
        workspaceAccess.requireWorkspaceOwner(user.getId(), workspaceId);
        return ResponseEntity.ok(memberService.updateRole(workspaceId, userId, role));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> remove(
            @AuthenticationPrincipal User user,
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId) {
        workspaceAccess.requireWorkspaceOwner(user.getId(), workspaceId);
        memberService.remove(workspaceId, userId);
        return ResponseEntity.noContent().build();
    }
}