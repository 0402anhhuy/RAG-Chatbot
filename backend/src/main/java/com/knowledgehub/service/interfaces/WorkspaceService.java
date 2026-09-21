package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.WorkspaceCreateRequest;
import com.knowledgehub.dto.request.WorkspaceUpdateRequest;
import com.knowledgehub.dto.response.WorkspaceResponse;
import java.util.List;
import java.util.UUID;

public interface WorkspaceService {
    WorkspaceResponse create(WorkspaceCreateRequest request, UUID ownerId);
    WorkspaceResponse getById(UUID id);
    List<WorkspaceResponse> getByOwner(UUID ownerId);
    WorkspaceResponse update(UUID id, WorkspaceUpdateRequest changes);
    void delete(UUID id);
}