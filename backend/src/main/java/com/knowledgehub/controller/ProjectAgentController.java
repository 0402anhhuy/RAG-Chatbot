package com.knowledgehub.controller;

import com.knowledgehub.dto.request.AgentCreateRequest;
import com.knowledgehub.dto.request.AgentUpdateRequest;
import com.knowledgehub.dto.response.AgentResponse;
import com.knowledgehub.entity.AgentType;
import com.knowledgehub.service.interfaces.AgentService;
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
@RequestMapping("/api/projects/{projectId}/agents")
public class ProjectAgentController {

    private final AgentService agentService;

    /**
     * Danh sách agent của project, có thể lọc theo type=BUILT_IN|CUSTOM.
     */
    @GetMapping
    public ResponseEntity<List<AgentResponse>> getByProject(
            @PathVariable UUID projectId,
            @RequestParam(required = false) AgentType type) {
        return ResponseEntity.ok(agentService.getByProject(projectId, type));
    }

    @GetMapping("/{agentId}")
    public ResponseEntity<AgentResponse> get(
            @PathVariable UUID projectId,
            @PathVariable UUID agentId) {
        return ResponseEntity.ok(agentService.get(projectId, agentId));
    }

    @PostMapping
    public ResponseEntity<AgentResponse> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody AgentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(agentService.create(projectId, request));
    }

    @PatchMapping("/{agentId}")
    public ResponseEntity<AgentResponse> update(
            @PathVariable UUID projectId,
            @PathVariable UUID agentId,
            @Valid @RequestBody AgentUpdateRequest changes) {
        return ResponseEntity.ok(agentService.update(projectId, agentId, changes));
    }

    @DeleteMapping("/{agentId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID projectId,
            @PathVariable UUID agentId) {
        agentService.delete(projectId, agentId);
        return ResponseEntity.noContent().build();
    }
}
