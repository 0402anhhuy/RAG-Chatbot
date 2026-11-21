package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.TaskCreateRequest;
import com.knowledgehub.dto.request.TaskMoveRequest;
import com.knowledgehub.dto.request.TaskReorderRequest;
import com.knowledgehub.dto.request.TaskUpdateRequest;
import com.knowledgehub.dto.response.TaskResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.Task;
import com.knowledgehub.entity.TaskPriority;
import com.knowledgehub.entity.TaskStatus;
import com.knowledgehub.entity.User;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.TaskRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.TaskService;
import com.knowledgehub.service.interfaces.KanbanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final EntityMapper entityMapper;
    private final KanbanService kanbanService;

    @Override
    public TaskResponse create(TaskCreateRequest request, UUID ownerId) {
        Project project = findProject(request.projectId());
        Task task = new Task();
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setProject(project);
        task.setAssignee(resolveAssignee(project, request.assigneeId(), request.assigneeEmail()));
        task.changeStatus(request.status() != null ? request.status() : TaskStatus.BACKLOG);
        task.setPriority(request.priority() != null ? request.priority() : TaskPriority.MEDIUM);
        task.setLabels(joinLabels(request.labels()));
        task.setStoryPoints(request.storyPoints());
        task.setOriginalEstimate(request.originalEstimate());
        task.setRemainingEstimate(request.remainingEstimate());
        Task saved = taskRepository.save(task);
        syncProjectTaskCount(project);
        return entityMapper.toTaskResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse getById(UUID id) {
        return entityMapper.toTaskResponse(findTask(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> getTasks(
            UUID ownerId, UUID projectId, TaskStatus status, Boolean archived, String search) {
        String normalizedSearch = search == null ? "" : search.trim();
        return taskRepository.search(ownerId, projectId, archived, normalizedSearch).stream()
                .filter(task -> status == null || task.getStatus() == status)
                .map(entityMapper::toTaskResponse)
                .toList();
    }

    @Override
    public TaskResponse update(UUID id, TaskUpdateRequest changes) {
        Task task = findTask(id);
        Project previousProject = task.getProject();

        if (changes.title() != null) {
            task.setTitle(changes.title().trim());
        }
        if (changes.description() != null) {
            task.setDescription(changes.description());
        }
        if (changes.status() != null) {
            task.changeStatus(changes.status());
        }
        if (changes.priority() != null) {
            task.setPriority(changes.priority());
        }
        if (changes.labels() != null) {
            task.setLabels(joinLabels(changes.labels()));
        }
        if (changes.storyPoints() != null) {
            task.setStoryPoints(changes.storyPoints());
        }
        if (changes.originalEstimate() != null) {
            task.setOriginalEstimate(changes.originalEstimate());
        }
        if (changes.remainingEstimate() != null) {
            task.setRemainingEstimate(changes.remainingEstimate());
        }
        if (changes.assigneeId() != null || changes.assigneeEmail() != null) {
            Project targetProject = changes.projectId() != null ? findProject(changes.projectId()) : task.getProject();
            task.setAssignee(resolveAssignee(targetProject, changes.assigneeId(), changes.assigneeEmail()));
        }
        if (changes.projectId() != null) {
            task.setProject(findProject(changes.projectId()));
        }

        Task saved = taskRepository.save(task);
        if (previousProject != null && !previousProject.getId().equals(saved.getProject().getId())) {
            syncProjectTaskCount(previousProject);
        }
        syncProjectTaskCount(saved.getProject());
        return entityMapper.toTaskResponse(saved);
    }

    @Override
    public TaskResponse archive(UUID id, boolean archived) {
        Task task = findTask(id);
        task.setArchived(archived);
        task.setArchivedAt(archived ? Instant.now() : null);
        return entityMapper.toTaskResponse(taskRepository.save(task));
    }

    @Override
    public void delete(UUID id) {
        Task task = findTask(id);
        Project project = task.getProject();
        taskRepository.delete(task);
        syncProjectTaskCount(project);
    }

    private Task findTask(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("taskId is required");
        }
        return taskRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Task not found: " + id));
    }

    private Project findProject(UUID projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));
    }

    private User resolveAssignee(UUID assigneeId) {
        if (assigneeId == null) {
            return null;
        }
        return userRepository.findById(assigneeId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + assigneeId));
    }

    /**
     * Assign theo email (UI Kanban chỉ biết email của member). Ai được gán task
     * sẽ tự động trở thành member của project.
     */
    private User resolveAssignee(Project project, UUID assigneeId, String assigneeEmail) {
        if (assigneeEmail != null && !assigneeEmail.isBlank()) {
            return kanbanService.resolveAssigneeByEmail(project.getId(), assigneeEmail);
        }
        return resolveAssignee(assigneeId);
    }

    @Override
    public TaskResponse move(UUID id, TaskMoveRequest request) {
        return kanbanService.move(id, request);
    }

    @Override
    public List<TaskResponse> reorder(UUID projectId, TaskStatus status, TaskReorderRequest request) {
        return kanbanService.reorder(projectId, status, request);
    }

    private void syncProjectTaskCount(Project project) {
        if (project == null) {
            return;
        }
        project.setTaskCount((int) taskRepository.countByProjectIdAndArchivedFalse(project.getId()));
        projectRepository.save(project);
    }

    private String joinLabels(List<String> labels) {
        if (labels == null || labels.isEmpty()) {
            return null;
        }
        String joined = labels.stream()
                .filter(label -> label != null && !label.isBlank())
                .map(String::trim)
                .collect(java.util.stream.Collectors.joining(","));
        return joined.isEmpty() ? null : joined;
    }
}
