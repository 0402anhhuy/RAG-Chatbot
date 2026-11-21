package com.knowledgehub.controller;

import com.knowledgehub.dto.response.KanbanBoardResponse;
import com.knowledgehub.service.interfaces.KanbanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Dữ liệu bảng Kanban của một project (4 cột + members).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects/{projectId}/kanban")
public class KanbanController {

    private final KanbanService kanbanService;

    @GetMapping
    public ResponseEntity<KanbanBoardResponse> getBoard(@PathVariable UUID projectId) {
        return ResponseEntity.ok(kanbanService.getBoard(projectId));
    }
}
