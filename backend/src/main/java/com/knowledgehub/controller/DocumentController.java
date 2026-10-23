package com.knowledgehub.controller;

import com.knowledgehub.dto.request.DocumentCreateRequest;
import com.knowledgehub.dto.request.DocumentUpdateRequest;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.entity.DocumentStatus;
import com.knowledgehub.service.interfaces.DocumentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping
    public ResponseEntity<DocumentResponse> create(
            @RequestParam UUID workspaceId,
            @Valid @RequestBody DocumentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.create(request, workspaceId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getByWorkspace(
            @RequestParam UUID workspaceId,
            @RequestParam(required = false) DocumentStatus status) {
        List<DocumentResponse> documents = (status == null)
                ? documentService.getByWorkspace(workspaceId)
                : documentService.getByWorkspaceAndStatus(workspaceId, status);
        return ResponseEntity.ok(documents);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DocumentResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody DocumentUpdateRequest changes) {
        return ResponseEntity.ok(documentService.update(id, changes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}