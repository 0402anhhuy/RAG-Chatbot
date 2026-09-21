package com.knowledgehub.controller;

import com.knowledgehub.dto.request.WorkspaceMemberRequest;
import com.knowledgehub.dto.response.WorkspaceMemberResponse;
import com.knowledgehub.entity.WorkspaceMemberRole;
import com.knowledgehub.service.interfaces.WorkspaceMemberService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces/{workspaceId}/members")
public class WorkspaceMemberController {

    private final WorkspaceMemberService memberService;

    @PostMapping
    public ResponseEntity<WorkspaceMemberResponse> add(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody WorkspaceMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberService.add(workspaceId, request));
    }

    @GetMapping
    public ResponseEntity<List<WorkspaceMemberResponse>> getByWorkspace(
            @PathVariable UUID workspaceId) {
        return ResponseEntity.ok(memberService.getByWorkspace(workspaceId));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<WorkspaceMemberResponse> get(
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId) {
        return ResponseEntity.ok(memberService.get(workspaceId, userId));
    }

    @PatchMapping("/{userId}")
    public ResponseEntity<WorkspaceMemberResponse> updateRole(
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId,
            @RequestParam WorkspaceMemberRole role) {
        return ResponseEntity.ok(memberService.updateRole(workspaceId, userId, role));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> remove(
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId) {
        memberService.remove(workspaceId, userId);
        return ResponseEntity.noContent().build();
    }
}