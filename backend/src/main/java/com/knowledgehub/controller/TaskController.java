package com.knowledgehub.controller;

import com.knowledgehub.dto.request.TaskArchiveRequest;
import com.knowledgehub.dto.request.TaskCreateRequest;
import com.knowledgehub.dto.request.TaskMoveRequest;
import com.knowledgehub.dto.request.TaskReorderRequest;
import com.knowledgehub.dto.request.TaskUpdateRequest;
import com.knowledgehub.dto.response.TaskResponse;
import com.knowledgehub.entity.TaskStatus;
import com.knowledgehub.service.interfaces.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<TaskResponse> create(
            @RequestParam(required = false) UUID ownerId,
            @Valid @RequestBody TaskCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(request, ownerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasks(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Boolean archived,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(taskService.getTasks(ownerId, projectId, status, archived, search));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TaskResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody TaskUpdateRequest changes) {
        return ResponseEntity.ok(taskService.update(id, changes));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<TaskResponse> move(
            @PathVariable UUID id,
            @Valid @RequestBody TaskMoveRequest request) {
        return ResponseEntity.ok(taskService.move(id, request));
    }

    @PatchMapping("/{id}/reorder")
    public ResponseEntity<List<TaskResponse>> reorder(
            @PathVariable UUID id,
            @Valid @RequestBody TaskReorderRequest request) {
        return ResponseEntity.ok(taskService.reorder(id, request.status(), request));
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<TaskResponse> archive(
            @PathVariable UUID id,
            @RequestBody TaskArchiveRequest request) {
        boolean archived = request == null || request.archived() == null || request.archived();
        return ResponseEntity.ok(taskService.archive(id, archived));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
