package com.knowledgehub.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgehub.dto.request.RagIngestJobCreateRequest;
import com.knowledgehub.dto.request.RagIngestJobUpdateRequest;
import com.knowledgehub.dto.response.RagIngestJobResponse;
import com.knowledgehub.entity.RagDocument;
import com.knowledgehub.entity.RagDocumentStatus;
import com.knowledgehub.entity.RagIngestJob;
import com.knowledgehub.entity.RagIngestJobStatus;
import com.knowledgehub.repository.RagDocumentRepository;
import com.knowledgehub.repository.RagIngestJobRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.RagIngestJobService;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class RagIngestJobServiceImpl implements RagIngestJobService {

    private static final int MAX_LIST_LIMIT = 500;
    private static final int DEFAULT_MAX_ATTEMPTS = 3;

    private final RagIngestJobRepository jobRepository;
    private final RagDocumentRepository documentRepository;
    private final ObjectMapper objectMapper;

    @Override
    public RagIngestJobResponse create(RagIngestJobCreateRequest request) {
        RagIngestJob job = new RagIngestJob();
        job.setId(request.jobId() != null && !request.jobId().isBlank()
                ? request.jobId().trim()
                : UUID.randomUUID().toString().replace("-", ""));
        job.setDocumentId(parseUuid(request.documentId()));
        job.setSourcePath(request.sourcePath());
        job.setChecksum(request.checksum());
        job.setStatus(RagIngestJobStatus.QUEUED);
        job.setProgress(0d);
        job.setTotalChunks(0);
        job.setAttempts(0);
        job.setMaxAttempts(request.maxAttempts() != null ? request.maxAttempts() : DEFAULT_MAX_ATTEMPTS);
        job.setMetadataJson(writeJson(request.metadata()));
        return toResponse(jobRepository.save(job));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RagIngestJobResponse> find(String jobId) {
        return jobRepository.findById(jobId).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RagIngestJobResponse> list(String status, int limit) {
        int safeLimit = Math.clamp(limit, 1, MAX_LIST_LIMIT);
        if (status == null || status.isBlank()) {
            return jobRepository.findAll(PageRequest.of(0, safeLimit)).stream().map(this::toResponse).toList();
        }
        return jobRepository.findByStatusOrderByCreatedAtDesc(RagIngestJobStatus.fromWire(status), Limit.of(safeLimit))
                .stream().map(this::toResponse).toList();
    }

    @Override
    public Optional<RagIngestJobResponse> reserveNext() {
        List<RagIngestJob> candidates = jobRepository.findByStatusOrderByCreatedAtAscUpdatedAtAsc(
                RagIngestJobStatus.QUEUED, Limit.of(1));
        if (candidates.isEmpty()) {
            return Optional.empty();
        }
        RagIngestJob job = candidates.getFirst();
        job.setStatus(RagIngestJobStatus.RUNNING);
        job.setAttempts(job.getAttempts() + 1);
        job.setProgress(0d);
        job.setStartedAt(Instant.now());
        return Optional.of(toResponse(jobRepository.save(job)));
    }

    @Override
    public RagIngestJobResponse update(String jobId, RagIngestJobUpdateRequest request) {
        RagIngestJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("RAG ingest job not found: " + jobId));
        RagIngestJobStatus status = RagIngestJobStatus.fromWire(request.status());
        job.setStatus(status);
        if (request.totalChunks() != null) {
            job.setTotalChunks(request.totalChunks());
        }
        if (request.progress() != null) {
            job.setProgress(Math.clamp(request.progress(), 0d, 1d));
        } else if (status == RagIngestJobStatus.SUCCEEDED) {
            job.setProgress(1d);
        } else if (status == RagIngestJobStatus.FAILED || status == RagIngestJobStatus.QUEUED) {
            job.setProgress(0d);
        }
        job.setError(request.error());
        if (status == RagIngestJobStatus.SUCCEEDED || status == RagIngestJobStatus.FAILED
                || status == RagIngestJobStatus.DELETED) {
            job.setFinishedAt(Instant.now());
        }
        return toResponse(jobRepository.save(job));
    }

    @Override
    public List<RagIngestJobResponse> recoverStale(int staleAfterSeconds, int maxAttempts) {
        Instant cutoff = Instant.now().minus(Duration.ofSeconds(Math.max(1, staleAfterSeconds)));
        List<RagIngestJob> stale = jobRepository.findByStatusAndUpdatedAtBeforeOrderByCreatedAtAsc(
                RagIngestJobStatus.RUNNING, cutoff);
        List<RagIngestJobResponse> recovered = new ArrayList<>(stale.size());
        for (RagIngestJob job : stale) {
            boolean retryable = job.getAttempts() < Math.max(job.getMaxAttempts(), maxAttempts);
            job.setStatus(retryable ? RagIngestJobStatus.QUEUED : RagIngestJobStatus.FAILED);
            job.setError(retryable ? null : "stale worker detected");
            job.setProgress(0d);
            recovered.add(toResponse(jobRepository.save(job)));
        }
        return recovered;
    }

    private RagIngestJobResponse toResponse(RagIngestJob job) {
        String documentStatus = job.getDocumentId() == null
                ? null
                : documentRepository.findById(job.getDocumentId())
                        .map(RagDocument::getStatus)
                        .map(RagDocumentStatus::wireValue)
                        .orElse("deleted");
        return new RagIngestJobResponse(
                job.getId(),
                job.getDocumentId() != null ? job.getDocumentId().toString() : null,
                job.getStatus() != null ? job.getStatus().wireValue() : null,
                job.getProgress(),
                job.getTotalChunks(),
                job.getAttempts(),
                job.getMaxAttempts(),
                job.getError(),
                job.getSourcePath(),
                job.getChecksum(),
                documentStatus,
                job.getCreatedAt(),
                job.getUpdatedAt());
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize ingest job metadata", exception);
        }
    }
}
