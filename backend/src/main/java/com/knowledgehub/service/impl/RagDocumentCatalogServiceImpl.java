package com.knowledgehub.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgehub.dto.request.RagChunkUpsertRequest;
import com.knowledgehub.dto.request.RagDocumentRegisterRequest;
import com.knowledgehub.dto.request.RagDocumentStatusUpdateRequest;
import com.knowledgehub.dto.response.RagChunkResponse;
import com.knowledgehub.dto.response.RagDocumentResponse;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.RagDocument;
import com.knowledgehub.entity.RagDocumentChunk;
import com.knowledgehub.entity.RagDocumentStatus;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.RagDocumentChunkRepository;
import com.knowledgehub.repository.RagDocumentRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.RagDocumentCatalogService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class RagDocumentCatalogServiceImpl implements RagDocumentCatalogService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final int DEFAULT_CHUNK_LIMIT = 2000;
    private static final int MAX_CHUNK_LIMIT = 10000;
    private static final List<RagDocumentStatus> INDEXABLE_STATUSES =
            List.of(RagDocumentStatus.PROCESSING, RagDocumentStatus.READY);

    private final RagDocumentRepository ragDocumentRepository;
    private final RagDocumentChunkRepository chunkRepository;
    private final DocumentRepository documentRepository;
    private final ObjectMapper objectMapper;

    @Override
    public RagDocumentResponse register(UUID documentId, RagDocumentRegisterRequest request) {
        RagDocument document = ragDocumentRepository.findById(documentId).orElseGet(RagDocument::new);
        String filename = request.filename() != null ? request.filename() : filenameOf(documentId);
        document.setDocumentId(documentId);
        document.setWorkspaceId(blankToNull(request.workspaceId()));
        document.setCourseCode(blankToNull(request.courseCode()));
        document.setFilename(filename);
        document.setSourcePath(request.sourcePath());
        document.setChecksum(request.checksum());
        document.setStatus(RagDocumentStatus.QUEUED);
        document.setChunkCount(0);
        document.setError(null);
        document.setMetadataJson(writeJson(request.metadata()));
        return toResponse(ragDocumentRepository.save(document));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RagDocumentResponse> find(UUID documentId) {
        return ragDocumentRepository.findByDocumentIdAndStatusNot(documentId, RagDocumentStatus.DELETED)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RagDocumentResponse> list(String workspaceId, String status) {
        String workspace = blankToNull(workspaceId);
        if (status == null || status.isBlank()) {
            List<RagDocument> documents = workspace == null
                    ? ragDocumentRepository.findByStatusNotOrderByCreatedAtDesc(RagDocumentStatus.DELETED)
                    : ragDocumentRepository.findByWorkspaceIdAndStatusNotOrderByCreatedAtDesc(
                            workspace, RagDocumentStatus.DELETED);
            return documents.stream().map(this::toResponse).toList();
        }
        RagDocumentStatus parsed = RagDocumentStatus.fromWire(status);
        if (workspace == null) {
            return ragDocumentRepository.findByStatusOrderByCreatedAtDesc(parsed, Limit.of(DEFAULT_CHUNK_LIMIT))
                    .stream().map(this::toResponse).toList();
        }
        return ragDocumentRepository.findByWorkspaceIdAndStatusOrderByCreatedAtDesc(workspace, parsed)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public RagDocumentResponse updateStatus(UUID documentId, RagDocumentStatusUpdateRequest request) {
        RagDocumentStatus status = RagDocumentStatus.fromWire(request.status());
        RagDocument document = ragDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("RAG document not found: " + documentId));

        // Tài liệu đã bị xóa thì không nhận báo cáo nữa, trừ khi chính là báo xóa.
        if (document.getStatus() == RagDocumentStatus.DELETED && status != RagDocumentStatus.DELETED) {
            throw new ServiceEntityNotFoundException("RAG document not found: " + documentId);
        }
        document.setStatus(status);
        if (request.chunkCount() != null) {
            document.setChunkCount(request.chunkCount());
        }
        document.setError(request.error());
        return toResponse(ragDocumentRepository.save(document));
    }

    @Override
    public void bindJob(UUID documentId, String jobId) {
        RagDocument document = ragDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("RAG document not found: " + documentId));
        document.setJobId(jobId);
        ragDocumentRepository.save(document);
    }

    @Override
    public int replaceChunks(UUID documentId, RagChunkUpsertRequest request) {
        RagDocument document = ragDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("RAG document not found: " + documentId));
        if (document.getStatus() == RagDocumentStatus.DELETED) {
            throw new ServiceEntityNotFoundException("RAG document was deleted during indexing: " + documentId);
        }

        chunkRepository.deleteByDocumentId(documentId);
        List<RagDocumentChunk> chunks = new ArrayList<>();
        for (RagChunkUpsertRequest.Chunk item : request.chunks()) {
            RagDocumentChunk chunk = new RagDocumentChunk();
            chunk.setChunkId(item.chunkId());
            chunk.setDocumentId(documentId);
            chunk.setChunkIndex(item.chunkIndex());
            chunk.setContent(item.content());
            chunk.setPageNumber(item.pageNumber());
            chunk.setSectionPath(item.sectionPath());
            chunk.setChecksum(item.checksum());
            chunk.setMetadataJson(writeJson(item.metadata()));
            chunks.add(chunk);
        }
        chunkRepository.saveAll(chunks);
        return chunks.size();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RagChunkResponse> listChunks(List<UUID> documentIds, Integer limit) {
        int safeLimit = limit == null ? DEFAULT_CHUNK_LIMIT : Math.max(1, Math.min(limit, MAX_CHUNK_LIMIT));
        List<RagDocument> documents = ragDocumentRepository.findAllById(
                documentIds == null ? List.of() : documentIds);
        Map<UUID, RagDocument> byId = new HashMap<>();
        documents.forEach(document -> byId.put(document.getDocumentId(), document));

        // Không có documentIds: trả chunk của mọi tài liệu đang indexable (dùng lúc
        // rag-service rebuild BM25/Qdrant sau khi khởi động).
        List<RagDocumentChunk> chunks = documentIds == null || documentIds.isEmpty()
                ? chunkRepository.findIndexable(INDEXABLE_STATUSES, Limit.of(safeLimit))
                : chunkRepository.findByDocumentIdInOrderByDocumentIdAscChunkIndexAsc(documentIds);

        List<RagChunkResponse> responses = new ArrayList<>(chunks.size());
        for (RagDocumentChunk chunk : chunks) {
            RagDocument document = byId.get(chunk.getDocumentId());
            Map<String, Object> metadata = readJson(chunk.getMetadataJson());
            if (document != null) {
                metadata.put("filename", document.getFilename());
                if (document.getWorkspaceId() != null) {
                    metadata.put("workspace_id", document.getWorkspaceId());
                }
            }
            responses.add(new RagChunkResponse(
                    chunk.getChunkId(),
                    chunk.getDocumentId().toString(),
                    chunk.getChunkIndex(),
                    chunk.getContent(),
                    chunk.getPageNumber(),
                    chunk.getSectionPath(),
                    chunk.getChecksum(),
                    document != null ? document.getWorkspaceId() : null,
                    document != null ? document.getFilename() : null,
                    metadata));
        }
        return responses;
    }

    @Override
    @Transactional(readOnly = true)
    public int countChunks(UUID documentId) {
        return (int) chunkRepository.countByDocumentId(documentId);
    }

    @Override
    public Optional<RagDocumentResponse> markDeleted(UUID documentId) {
        return ragDocumentRepository.findByDocumentIdAndStatusNot(documentId, RagDocumentStatus.DELETED)
                .map(document -> {
                    document.setStatus(RagDocumentStatus.DELETED);
                    document.setChunkCount(0);
                    document.setError(null);
                    RagDocument saved = ragDocumentRepository.save(document);
                    chunkRepository.deleteByDocumentId(documentId);
                    return toResponse(saved);
                });
    }

    private RagDocumentResponse toResponse(RagDocument document) {
        return new RagDocumentResponse(
                document.getDocumentId().toString(),
                document.getWorkspaceId(),
                document.getCourseCode(),
                document.getFilename(),
                document.getChecksum(),
                document.getStatus(),
                document.getChunkCount(),
                document.getJobId(),
                document.getCreatedAt(),
                document.getUpdatedAt(),
                document.getSourcePath(),
                document.getError(),
                readJson(document.getMetadataJson()),
                document.getStatus() != null ? document.getStatus().wireValue() : null);
    }

    private String filenameOf(UUID documentId) {
        return documentRepository.findById(documentId)
                .map(Document::getFilename)
                .orElse("document-" + documentId);
    }

    private Map<String, Object> readJson(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(json, MAP_TYPE);
        } catch (JsonProcessingException exception) {
            return new LinkedHashMap<>();
        }
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize RAG metadata", exception);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
