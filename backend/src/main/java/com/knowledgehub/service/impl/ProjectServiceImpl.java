package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.ProjectCreateRequest;
import com.knowledgehub.dto.request.ProjectUpdateRequest;
import com.knowledgehub.dto.response.ProjectResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProjectStatus;
import com.knowledgehub.entity.ProjectType;
import com.knowledgehub.entity.User;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final EntityMapper entityMapper;

    @Override
    public ProjectResponse create(ProjectCreateRequest request, UUID ownerId) {
        User owner = findOwner(ownerId);
        Project project = new Project();
        project.setName(request.name().trim());
        project.setDescription(request.description());
        project.setType(request.type() != null ? request.type() : ProjectType.LOCAL);
        project.setStatus(request.status() != null ? request.status() : ProjectStatus.IDLE);
        project.setPinned(Boolean.TRUE.equals(request.pinned()));
        project.setRepositoryUrl(request.repositoryUrl());
        project.setOwner(owner);
        return entityMapper.toProjectResponse(projectRepository.save(project));
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse getById(UUID id) {
        return entityMapper.toProjectResponse(findProject(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjects(UUID ownerId, ProjectStatus status, String search) {
        List<Project> projects = ownerId == null
                ? projectRepository.findAll()
                : status == null
                    ? projectRepository.findByOwnerIdOrderByUpdatedAtDesc(ownerId)
                    : projectRepository.findByOwnerIdAndStatusOrderByUpdatedAtDesc(ownerId, status);

        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
        return projects.stream()
                .filter(project -> normalizedSearch.isEmpty()
                        || project.getName().toLowerCase().contains(normalizedSearch))
                .map(entityMapper::toProjectResponse)
                .toList();
    }

    @Override
    public ProjectResponse update(UUID id, ProjectUpdateRequest changes) {
        Project project = findProject(id);
        if (changes.name() != null) project.setName(changes.name().trim());
        if (changes.description() != null) project.setDescription(changes.description());
        if (changes.type() != null) project.setType(changes.type());
        if (changes.status() != null) project.setStatus(changes.status());
        if (changes.pinned() != null) project.setPinned(changes.pinned());
        if (changes.repositoryUrl() != null) project.setRepositoryUrl(changes.repositoryUrl());
        return entityMapper.toProjectResponse(projectRepository.save(project));
    }

    @Override
    public ProjectResponse togglePinned(UUID id) {
        Project project = findProject(id);
        project.setPinned(!project.isPinned());
        return entityMapper.toProjectResponse(projectRepository.save(project));
    }

    @Override
    public void delete(UUID id) {
        projectRepository.delete(findProject(id));
    }

    private Project findProject(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + id));
    }

    private User findOwner(UUID ownerId) {
        if (ownerId == null) {
            throw new IllegalArgumentException("ownerId is required");
        }
        return userRepository.findById(ownerId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + ownerId));
    }
}
