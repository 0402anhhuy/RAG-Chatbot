package com.knowledgehub.controller;

import com.knowledgehub.dto.request.DocumentCreateRequest;
import com.knowledgehub.dto.request.DocumentUpdateRequest;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.entity.DocumentStatus;
import com.knowledgehub.service.interfaces.DocumentService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("workspaceId") UUID workspaceId,
            @RequestParam(value = "courseCode", defaultValue = "GEN") String courseCode) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.upload(file, workspaceId, courseCode));
    }

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
            @RequestParam(required = false) String courseCode,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) DocumentStatus status) {
        if (status != null) {
            return ResponseEntity.ok(documentService.getByWorkspaceAndStatus(workspaceId, status));
        }
        return ResponseEntity.ok(documentService.getByWorkspace(workspaceId, courseCode, fileType));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable UUID id) {
        Resource resource = documentService.loadAsResource(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> previewDocument(@PathVariable UUID id) {
        Resource resource = documentService.loadAsResource(id);
        String filename = resource.getFilename();

        MediaType mediaType = MediaTypeFactory.getMediaType(filename)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
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