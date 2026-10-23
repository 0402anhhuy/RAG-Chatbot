package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.ProjectCreateRequest;
import com.knowledgehub.dto.request.ProjectUpdateRequest;
import com.knowledgehub.dto.response.ProjectResponse;
import com.knowledgehub.entity.ProjectStatus;

import java.util.List;
import java.util.UUID;

public interface ProjectService {
    ProjectResponse create(ProjectCreateRequest request, UUID ownerId);
    ProjectResponse getById(UUID id);
    List<ProjectResponse> getProjects(UUID ownerId, ProjectStatus status, String search);
    ProjectResponse update(UUID id, ProjectUpdateRequest changes);
    ProjectResponse togglePinned(UUID id);
    void delete(UUID id);
}
