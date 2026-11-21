package com.knowledgehub.controller;

import com.knowledgehub.dto.request.WorkflowCreateRequest;
import com.knowledgehub.dto.request.WorkflowUpdateRequest;
import com.knowledgehub.dto.response.WorkflowResponse;
import com.knowledgehub.entity.WorkflowType;
import com.knowledgehub.service.interfaces.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects/{projectId}/workflows")
public class ProjectWorkflowController {

    private final WorkflowService workflowService;

    /**
     * Danh sách workflow của project, có thể lọc theo type=BUILT_IN|CUSTOM.
     */
    @GetMapping
    public ResponseEntity<List<WorkflowResponse>> getByProject(
            @PathVariable UUID projectId,
            @RequestParam(required = false) WorkflowType type) {
        return ResponseEntity.ok(workflowService.getByProject(projectId, type));
    }

    @GetMapping("/{workflowId}")
    public ResponseEntity<WorkflowResponse> get(
            @PathVariable UUID projectId,
            @PathVariable UUID workflowId) {
        return ResponseEntity.ok(workflowService.get(projectId, workflowId));
    }

    @PostMapping
    public ResponseEntity<WorkflowResponse> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody WorkflowCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workflowService.create(projectId, request));
    }

    @PatchMapping("/{workflowId}")
    public ResponseEntity<WorkflowResponse> update(
            @PathVariable UUID projectId,
            @PathVariable UUID workflowId,
            @Valid @RequestBody WorkflowUpdateRequest changes) {
        return ResponseEntity.ok(workflowService.update(projectId, workflowId, changes));
    }

    @DeleteMapping("/{workflowId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID projectId,
            @PathVariable UUID workflowId) {
        workflowService.delete(projectId, workflowId);
        return ResponseEntity.noContent().build();
    }
}
