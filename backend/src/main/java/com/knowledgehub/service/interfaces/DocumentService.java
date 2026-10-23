package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.DocumentCreateRequest;
import com.knowledgehub.dto.request.DocumentUpdateRequest;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.entity.DocumentStatus;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

public interface DocumentService {
    DocumentResponse upload(MultipartFile file, UUID workspaceId, String courseCode) throws IOException;
    DocumentResponse create(DocumentCreateRequest request, UUID workspaceId);
    DocumentResponse getById(UUID id);
    List<DocumentResponse> getByWorkspace(UUID workspaceId, String courseCode, String fileType);
    List<DocumentResponse> getByWorkspaceAndStatus(UUID workspaceId, DocumentStatus status);
    Resource loadAsResource(UUID id);
    DocumentResponse update(UUID id, DocumentUpdateRequest changes);
    void delete(UUID id);
}