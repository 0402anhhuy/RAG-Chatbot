package com.knowledgehub.controller;

import com.knowledgehub.dto.request.WorkbenchFileCreateRequest;
import com.knowledgehub.dto.request.WorkbenchFileUpdateRequest;
import com.knowledgehub.dto.request.WorkbenchSettingsUpdateRequest;
import com.knowledgehub.dto.request.WorkbenchSyncRequest;
import com.knowledgehub.dto.response.WorkbenchFileContentResponse;
import com.knowledgehub.dto.response.WorkbenchFileResponse;
import com.knowledgehub.dto.response.WorkbenchSettingsResponse;
import com.knowledgehub.service.interfaces.WorkbenchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * API cho tab IDE trong một project: cây file, đọc/lưu file trên editor, sync
 * với thư mục local, tải transcript và cấu hình thanh prompt.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects/{projectId}/workbench")
public class WorkbenchController {

    private final WorkbenchService workbenchService;

    // ------------------------------------------------------------------ files
    @GetMapping("/files")
    public ResponseEntity<List<WorkbenchFileResponse>> listFiles(
            @PathVariable UUID projectId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String extension,
            @RequestParam(defaultValue = "true") boolean tree) {
        return ResponseEntity.ok(workbenchService.listFiles(projectId, search, extension, tree));
    }

    @PostMapping("/files")
    public ResponseEntity<WorkbenchFileResponse> createFile(
            @PathVariable UUID projectId,
            @Valid @RequestBody WorkbenchFileCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workbenchService.createFile(projectId, request));
    }

    @GetMapping("/files/{fileId}")
    public ResponseEntity<WorkbenchFileContentResponse> getFile(
            @PathVariable UUID projectId,
            @PathVariable UUID fileId) {
        return ResponseEntity.ok(workbenchService.getFileContent(projectId, fileId));
    }

    @PatchMapping("/files/{fileId}")
    public ResponseEntity<WorkbenchFileContentResponse> saveFile(
            @PathVariable UUID projectId,
            @PathVariable UUID fileId,
            @RequestBody WorkbenchFileUpdateRequest request) {
        return ResponseEntity.ok(workbenchService.saveFileContent(projectId, fileId, request));
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<Void> deleteFile(
            @PathVariable UUID projectId,
            @PathVariable UUID fileId) {
        workbenchService.deleteFile(projectId, fileId);
        return ResponseEntity.noContent().build();
    }

    /**
     * "Sync to folder": đẩy toàn bộ file đang có trên máy lên workspace.
     */
    @PostMapping("/sync")
    public ResponseEntity<List<WorkbenchFileResponse>> sync(
            @PathVariable UUID projectId,
            @Valid @RequestBody List<@Valid WorkbenchSyncRequest> files) {
        return ResponseEntity.ok(workbenchService.syncToWorkspace(projectId, files));
    }

    /**
     * "Upload file": nội dung một file dạng text (markdown, code, txt...).
     */
    @PostMapping("/upload")
    public ResponseEntity<WorkbenchFileResponse> upload(
            @PathVariable UUID projectId,
            @Valid @RequestBody WorkbenchSyncRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workbenchService.uploadFile(projectId, request.path(), request.content()));
    }

    /**
     * "Download workspace": cả workspace dưới dạng một file markdown để FE tải
     * về.
     */
    @GetMapping(value = "/download", produces = MediaType.TEXT_MARKDOWN_VALUE)
    public ResponseEntity<String> downloadWorkspace(
            @PathVariable UUID projectId,
            @RequestParam(required = false) String filename) {
        String content = workbenchService.buildTranscript(projectId, null);
        String safeName = filename == null || filename.isBlank() ? "workspace.md" : filename.trim();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeName + "\"")
                .body(content);
    }

    /**
     * "Download transcript (.md)" của conversation đang mở.
     */
    @GetMapping(value = "/conversations/{conversationId}/transcript", produces = MediaType.TEXT_MARKDOWN_VALUE)
    public ResponseEntity<String> downloadTranscript(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId) {
        String content = workbenchService.buildTranscript(projectId, conversationId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"transcript.md\"")
                .body(content);
    }

    // --------------------------------------------------------------- settings
    @GetMapping("/settings")
    public ResponseEntity<WorkbenchSettingsResponse> getSettings(
            @PathVariable UUID projectId,
            @RequestParam(required = false) UUID conversationId) {
        return ResponseEntity.ok(workbenchService.getSettings(projectId, conversationId));
    }

    @PatchMapping("/settings")
    public ResponseEntity<WorkbenchSettingsResponse> updateSettings(
            @PathVariable UUID projectId,
            @RequestParam UUID conversationId,
            @RequestBody WorkbenchSettingsUpdateRequest request) {
        return ResponseEntity.ok(workbenchService.updateSettings(projectId, conversationId, request));
    }
}
