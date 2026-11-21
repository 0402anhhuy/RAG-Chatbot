package com.knowledgehub.controller;

import com.knowledgehub.dto.request.WorkspaceCreateRequest;
import com.knowledgehub.dto.request.WorkspaceUpdateRequest;
import com.knowledgehub.dto.response.WorkspaceResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.rag.RagWorkspaceAccess;
import com.knowledgehub.service.interfaces.WorkspaceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final RagWorkspaceAccess workspaceAccess;

    @PostMapping
    public ResponseEntity<WorkspaceResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody WorkspaceCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workspaceService.create(request, user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkspaceResponse> getById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        workspaceAccess.requireReadAccess(user.getId(), id, List.of());
        return ResponseEntity.ok(workspaceService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<WorkspaceResponse>> getByOwner(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID ownerId) {
        if (ownerId != null && !user.getId().equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner does not match authenticated user");
        }
        return ResponseEntity.ok(workspaceService.getByOwner(user.getId()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<WorkspaceResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody WorkspaceUpdateRequest changes) {
        workspaceAccess.requireWorkspaceOwner(user.getId(), id);
        return ResponseEntity.ok(workspaceService.update(id, changes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        workspaceAccess.requireWorkspaceOwner(user.getId(), id);
        workspaceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}