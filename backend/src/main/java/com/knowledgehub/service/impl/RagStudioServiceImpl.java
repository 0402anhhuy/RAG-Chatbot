package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.RagDocumentContextRequest;
import com.knowledgehub.dto.response.RagChunkResponse;
import com.knowledgehub.dto.response.RagDocumentContextResponse;
import com.knowledgehub.entity.RagDocument;
import com.knowledgehub.entity.RagDocumentStatus;
import com.knowledgehub.rag.RagServiceClient;
import com.knowledgehub.repository.RagDocumentRepository;

import com.knowledgehub.service.interfaces.RagDocumentCatalogService;
import com.knowledgehub.service.interfaces.RagStudioService;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ghép dữ liệu tài liệu (BE) với phần sinh nội dung (rag-service).
 *
 * <p>
 * BE quyết định tài liệu nào được phép dùng và lấy text chunk; phần LLM/embedding
 * vẫn do rag-service chạy vì đó là cấu hình RAG thuần (provider, model, prompt).
 * </p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class RagStudioServiceImpl implements RagStudioService {

    private static final List<RagDocumentStatus> READY = List.of(RagDocumentStatus.READY);

    private final RagDocumentRepository ragDocumentRepository;
    private final RagDocumentCatalogService catalogService;
    private final RagServiceClient ragServiceClient;

    @Override
    public RagDocumentContextResponse loadContext(RagDocumentContextRequest request) {
        if (request == null || request.workspaceId() == null || request.workspaceId().isBlank()) {
            throw new IllegalArgumentException("workspaceId is required");
        }
        String workspaceId = request.workspaceId().trim();
        List<RagDocument> ready = ragDocumentRepository.findByWorkspaceIdAndStatusOrderByCreatedAtDesc(
                workspaceId, RagDocumentStatus.READY);

        LinkedHashSet<UUID> requested = parseIds(request.documentIds());
        List<UUID> selected = new ArrayList<>();
        for (RagDocument document : ready) {
            if (requested.isEmpty() || requested.contains(document.getDocumentId())) {
                selected.add(document.getDocumentId());
            }
        }

        List<RagChunkResponse> chunks = selected.isEmpty()
                ? List.of()
                : catalogService.listChunks(selected, request.maxChars());
        List<String> readyIds = selected.stream().map(UUID::toString).toList();
        return new RagDocumentContextResponse(workspaceId, readyIds, chunks);
    }

    @Override
    public Map<String, Object> flashcards(String workspaceId, List<UUID> documentIds, int maxItems) {
        return ragServiceClient.generateFlashcards(workspaceId, idsAsStrings(documentIds), maxItems);
    }

    @Override
    public Map<String, Object> exams(String workspaceId, List<UUID> documentIds, int maxItems) {
        return ragServiceClient.generateExam(workspaceId, idsAsStrings(documentIds), maxItems);
    }



    private LinkedHashSet<UUID> parseIds(List<String> values) {
        LinkedHashSet<UUID> ids = new LinkedHashSet<>();
        if (values == null) {
            return ids;
        }
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }
            try {
                ids.add(UUID.fromString(value.trim()));
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("documentIds must contain UUID values: " + value);
            }
        }
        return ids;
    }

    private List<String> idsAsStrings(List<UUID> documentIds) {
        return documentIds == null ? List.of() : documentIds.stream().map(UUID::toString).toList();
    }
}
