package com.knowledgehub.controller;

import com.knowledgehub.dto.request.RagIngestJobCreateRequest;
import com.knowledgehub.dto.request.RagIngestJobUpdateRequest;
import com.knowledgehub.dto.response.RagIngestJobResponse;
import com.knowledgehub.service.interfaces.RagIngestJobService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Hàng đợi ingest dùng chung: rag-service là worker, BE là nơi lưu trạng thái.
 *
 * <p>
 * Việc reserve/recover chạy trong một transaction ở BE nên hai bản rag-service
 * không lấy trùng job.
 * </p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rag")
public class RagIngestJobController {

    private final RagIngestJobService jobService;

    @PostMapping("/ingest/jobs")
    public ResponseEntity<RagIngestJobResponse> create(@Valid @RequestBody RagIngestJobCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.create(request));
    }

    @GetMapping("/ingest/jobs/{jobId}")
    public ResponseEntity<RagIngestJobResponse> get(@PathVariable String jobId) {
        return jobService.find(jobId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/ingest/jobs")
    public ResponseEntity<List<RagIngestJobResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(jobService.list(status, limit));
    }

    @PatchMapping("/ingest/jobs/{jobId}")
    public ResponseEntity<RagIngestJobResponse> update(
            @PathVariable String jobId,
            @Valid @RequestBody RagIngestJobUpdateRequest request) {
        return ResponseEntity.ok(jobService.update(jobId, request));
    }

    @PostMapping("/ingest/jobs/next")
    public ResponseEntity<RagIngestJobResponse> reserveNext() {
        return jobService.reserveNext()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/ingest/jobs/recover")
    public ResponseEntity<List<RagIngestJobResponse>> recover(
            @RequestParam int staleAfterSeconds,
            @RequestParam int maxAttempts) {
        return ResponseEntity.ok(jobService.recoverStale(staleAfterSeconds, maxAttempts));
    }
}
