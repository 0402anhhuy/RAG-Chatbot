package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.DocumentCreateRequest;
import com.knowledgehub.dto.request.DocumentUpdateRequest;
import com.knowledgehub.dto.response.DocumentResponse;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.DocumentStatus;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.DocumentService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final EntityMapper entityMapper;

    @Override
    public DocumentResponse create(DocumentCreateRequest request, UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + workspaceId));

        Document document = new Document();
        document.setFilename(request.filename());
        document.setStoragePath(request.storagePath());
        document.setWorkspace(workspace);
        document.setStatus(DocumentStatus.PENDING); // Trạng thái mặc định chờ chunk/embed
        document.setChunkCount(0);

        Document savedDocument = documentRepository.save(document);
        return entityMapper.toDocumentResponse(savedDocument);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse getById(UUID id) {
        return documentRepository.findById(id)
                .map(entityMapper::toDocumentResponse)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Document not found: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentResponse> getByWorkspace(UUID workspaceId) {
        return documentRepository.findByWorkspaceId(workspaceId)
                .stream()
                .map(entityMapper::toDocumentResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentResponse> getByWorkspaceAndStatus(UUID workspaceId, DocumentStatus status) {
        return documentRepository.findByWorkspaceIdAndStatus(workspaceId, status)
                .stream()
                .map(entityMapper::toDocumentResponse)
                .toList();
    }

    @Override
    public DocumentResponse update(UUID id, DocumentUpdateRequest changes) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Document not found: " + id));

        if (changes.filename() != null) document.setFilename(changes.filename());
        if (changes.storagePath() != null) document.setStoragePath(changes.storagePath());
        if (changes.status() != null) document.setStatus(changes.status());
        if (changes.chunkCount() != null) document.setChunkCount(changes.chunkCount());

        Document updatedDocument = documentRepository.save(document);
        return entityMapper.toDocumentResponse(updatedDocument);
    }

    @Override
    public void delete(UUID id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Document not found: " + id));
        documentRepository.delete(document);
    }
}