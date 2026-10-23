package com.knowledgehub.controller;

import com.knowledgehub.dto.request.ProjectCreateRequest;
import com.knowledgehub.dto.request.ProjectUpdateRequest;
import com.knowledgehub.dto.response.ProjectResponse;
import com.knowledgehub.entity.ProjectStatus;
import com.knowledgehub.service.interfaces.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectResponse> create(
            @RequestParam UUID ownerId,
            @Valid @RequestBody ProjectCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.create(request, ownerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getProjects(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(projectService.getProjects(ownerId, status, search));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ProjectResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody ProjectUpdateRequest changes) {
        return ResponseEntity.ok(projectService.update(id, changes));
    }

    @PatchMapping("/{id}/pin")
    public ResponseEntity<ProjectResponse> togglePinned(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.togglePinned(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
