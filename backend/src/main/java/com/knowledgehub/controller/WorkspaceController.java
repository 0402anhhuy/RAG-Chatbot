package com.knowledgehub.controller;

import com.knowledgehub.dto.request.WorkspaceCreateRequest;
import com.knowledgehub.dto.request.WorkspaceUpdateRequest;
import com.knowledgehub.dto.response.WorkspaceResponse;
import com.knowledgehub.service.interfaces.WorkspaceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping
    public ResponseEntity<WorkspaceResponse> create(
            @RequestParam UUID ownerId,
            @Valid @RequestBody WorkspaceCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workspaceService.create(request, ownerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkspaceResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(workspaceService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<WorkspaceResponse>> getByOwner(@RequestParam UUID ownerId) {
        return ResponseEntity.ok(workspaceService.getByOwner(ownerId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<WorkspaceResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody WorkspaceUpdateRequest changes) {
        return ResponseEntity.ok(workspaceService.update(id, changes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        workspaceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}