package com.knowledgehub.controller.academyhub;

import com.knowledgehub.dto.request.DocumentCreateRequest;
import com.knowledgehub.dto.request.DocumentUpdateRequest;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.entity.DocumentStatus;
import com.knowledgehub.entity.User;
import com.knowledgehub.rag.RagWorkspaceAccess;
import com.knowledgehub.service.interfaces.DocumentService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/documents")
public class AcademyDocumentController {

    private final DocumentService documentService;
    private final RagWorkspaceAccess workspaceAccess;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam("workspaceId") UUID workspaceId,
            @RequestParam(value = "courseCode", defaultValue = "GEN") String courseCode) throws IOException {
        workspaceAccess.requireReadAccess(user.getId(), workspaceId, List.of());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.upload(file, workspaceId, courseCode));
    }

    @PostMapping
    public ResponseEntity<DocumentResponse> create(
            @AuthenticationPrincipal User user,
            @RequestParam UUID workspaceId,
            @Valid @RequestBody DocumentCreateRequest request) {
        workspaceAccess.requireReadAccess(user.getId(), workspaceId, List.of());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.create(request, workspaceId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getById(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        requireDocumentAccess(user, id);
        return ResponseEntity.ok(documentService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getByWorkspace(
            @AuthenticationPrincipal User user,
            @RequestParam UUID workspaceId,
            @RequestParam(required = false) String courseCode,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) DocumentStatus status) {
        workspaceAccess.requireReadAccess(user.getId(), workspaceId, List.of());
        if (status != null) {
            return ResponseEntity.ok(documentService.getByWorkspaceAndStatus(workspaceId, status));
        }
        return ResponseEntity.ok(documentService.getByWorkspace(workspaceId, courseCode, fileType));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        requireDocumentAccess(user, id);
        Resource resource = documentService.loadAsResource(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> previewDocument(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        requireDocumentAccess(user, id);
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
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody DocumentUpdateRequest changes) {
        requireDocumentAccess(user, id);
        return ResponseEntity.ok(documentService.update(id, changes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        requireDocumentAccess(user, id);
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private void requireDocumentAccess(User user, UUID documentId) {
        DocumentResponse document = documentService.getById(documentId);
        if (document.workspaceId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        }
        workspaceAccess.requireReadAccess(user.getId(), document.workspaceId(), List.of(documentId));
    }
}