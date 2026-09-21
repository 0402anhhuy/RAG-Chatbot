package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.WorkspaceCreateRequest;
import com.knowledgehub.dto.request.WorkspaceUpdateRequest;
import com.knowledgehub.dto.response.WorkspaceResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.WorkspaceService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class WorkspaceServiceImpl implements WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final EntityMapper entityMapper;

    @Override
    public WorkspaceResponse create(WorkspaceCreateRequest request, UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + ownerId));

        Workspace workspace = new Workspace();
        workspace.setName(request.name());
        workspace.setDescription(request.description());
        workspace.setOwner(owner);

        Workspace saved = workspaceRepository.save(workspace);
        return entityMapper.toWorkspaceResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceResponse getById(UUID id) {
        return workspaceRepository.findById(id)
                .map(entityMapper::toWorkspaceResponse)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceResponse> getByOwner(UUID ownerId) {
        return workspaceRepository.findByOwnerId(ownerId)
                .stream()
                .map(entityMapper::toWorkspaceResponse)
                .toList();
    }

    @Override
    public WorkspaceResponse update(UUID id, WorkspaceUpdateRequest changes) {
        Workspace workspace = workspaceRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + id));

        if (changes.name() != null) workspace.setName(changes.name());
        if (changes.description() != null) workspace.setDescription(changes.description());

        Workspace updated = workspaceRepository.save(workspace);
        return entityMapper.toWorkspaceResponse(updated);
    }

    @Override
    public void delete(UUID id) {
        Workspace workspace = workspaceRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + id));
        workspaceRepository.delete(workspace);
    }
}