package com.knowledgehub.controller;

import com.knowledgehub.dto.request.RagChunkUpsertRequest;
import com.knowledgehub.dto.request.RagDocumentRegisterRequest;
import com.knowledgehub.dto.request.RagDocumentStatusUpdateRequest;
import com.knowledgehub.dto.response.RagChunkResponse;
import com.knowledgehub.dto.response.RagDocumentResponse;
import com.knowledgehub.service.interfaces.RagDocumentCatalogService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * API nội bộ cho rag-service thao tác trên catalog tài liệu / chunk.
 *
 * <p>
 * rag-service không còn kết nối DB: mọi bản ghi {@code rag_documents} và
 * {@code rag_document_chunks} đều đi qua đây (xác thực bằng API key nội bộ).
 * </p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rag")
public class RagCatalogController {

    private final RagDocumentCatalogService catalogService;

    @PutMapping("/documents/{documentId}")
    public ResponseEntity<RagDocumentResponse> register(
            @PathVariable UUID documentId,
            @Valid @RequestBody RagDocumentRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.register(documentId, request));
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<RagDocumentResponse> get(@PathVariable UUID documentId) {
        return catalogService.find(documentId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/documents")
    public ResponseEntity<List<RagDocumentResponse>> list(
            @RequestParam(required = false) String workspaceId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(catalogService.list(workspaceId, status));
    }

    @PatchMapping("/documents/{documentId}/status")
    public ResponseEntity<RagDocumentResponse> updateStatus(
            @PathVariable UUID documentId,
            @Valid @RequestBody RagDocumentStatusUpdateRequest request) {
        return ResponseEntity.ok(catalogService.updateStatus(documentId, request));
    }

    @PutMapping("/documents/{documentId}/job")
    public ResponseEntity<Void> bindJob(
            @PathVariable UUID documentId,
            @RequestParam String jobId) {
        catalogService.bindJob(documentId, jobId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/documents/{documentId}/chunks")
    public ResponseEntity<ChunkWriteResponse> replaceChunks(
            @PathVariable UUID documentId,
            @Valid @RequestBody RagChunkUpsertRequest request) {
        int chunkCount = catalogService.replaceChunks(documentId, request);
        return ResponseEntity.ok(new ChunkWriteResponse(documentId.toString(), chunkCount));
    }

    @GetMapping("/documents/{documentId}/chunks")
    public ResponseEntity<List<RagChunkResponse>> listDocumentChunks(@PathVariable UUID documentId) {
        return ResponseEntity.ok(catalogService.listChunks(List.of(documentId), null));
    }

    @GetMapping("/chunks")
    public ResponseEntity<List<RagChunkResponse>> listChunks(
            @RequestParam(required = false) List<UUID> documentIds,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(catalogService.listChunks(documentIds, limit));
    }

    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID documentId) {
        catalogService.markDeleted(documentId);
        return ResponseEntity.noContent().build();
    }

    public record ChunkWriteResponse(String documentId, int chunkCount) {
    }
}
