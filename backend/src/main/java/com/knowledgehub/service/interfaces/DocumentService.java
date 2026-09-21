package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.DocumentCreateRequest;
import com.knowledgehub.dto.request.DocumentUpdateRequest;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.entity.DocumentStatus;
import java.util.List;
import java.util.UUID;

public interface DocumentService {
    DocumentResponse create(DocumentCreateRequest request, UUID workspaceId);
    DocumentResponse getById(UUID id);
    List<DocumentResponse> getByWorkspace(UUID workspaceId);
    List<DocumentResponse> getByWorkspaceAndStatus(UUID workspaceId, DocumentStatus status);
    DocumentResponse update(UUID id, DocumentUpdateRequest changes);
    void delete(UUID id);
}