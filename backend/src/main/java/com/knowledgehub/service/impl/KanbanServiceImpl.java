package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.TaskMoveRequest;
import com.knowledgehub.dto.request.TaskReorderRequest;
import com.knowledgehub.dto.response.KanbanBoardResponse;
import com.knowledgehub.dto.response.ProjectMemberResponse;
import com.knowledgehub.dto.response.TaskResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProjectMember;
import com.knowledgehub.entity.ProjectMemberRole;
import com.knowledgehub.entity.Task;
import com.knowledgehub.entity.TaskStatus;
import com.knowledgehub.entity.User;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.ProjectMemberRepository;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.TaskRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.KanbanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class KanbanServiceImpl implements KanbanService {

    private static final List<TaskStatus> BOARD_COLUMNS = List.of(
            TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.COMPLETED);

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final EntityMapper entityMapper;

    @Override
    @Transactional(readOnly = true)
    public KanbanBoardResponse getBoard(UUID projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));

        // Lấy toàn bộ task chưa archive của project rồi tự nhóm theo cột để luôn đủ 4 cột
        List<Task> tasks = taskRepository.search(null, projectId, false, "");

        Map<TaskStatus, List<Task>> grouped = new LinkedHashMap<>();
        BOARD_COLUMNS.forEach(status -> grouped.put(status, new ArrayList<>()));
        tasks.forEach(task -> grouped
                .computeIfAbsent(task.getStatus(), key -> new ArrayList<>())
                .add(task));
        grouped.values().forEach(column -> column.sort(Task::compareForBoard));

        List<KanbanBoardResponse.Column> columns = BOARD_COLUMNS.stream()
                .map(status -> new KanbanBoardResponse.Column(
                        status,
                        label(status),
                        grouped.get(status).size(),
                        grouped.get(status).stream().map(entityMapper::toTaskResponse).toList()))
                .toList();

        List<ProjectMemberResponse> members = projectMemberRepository
                .findByProjectIdOrderByJoinedAtAsc(projectId)
                .stream()
                .map(ProjectMemberResponse::fromEntity)
                .toList();

        return new KanbanBoardResponse(project.getId(), project.getName(), columns, members);
    }

    @Override
    public TaskResponse move(UUID taskId, TaskMoveRequest request) {
        Task task = findTask(taskId);
        Project project = task.getProject();
        TaskStatus targetStatus = request.status();
        boolean columnChanged = task.getStatus() != targetStatus;

        task.changeStatus(targetStatus);
        Task saved = taskRepository.save(task);

        // Khi đổi cột: đưa task xuống cuối cột mới, đẩy các task đang ở đầu cột xuống
        if (columnChanged) {
            repositionAtEnd(project.getId(), targetStatus, saved.getId());
        }

        syncProjectTaskCount(project);
        return entityMapper.toTaskResponse(saved);
    }

    @Override
    public List<TaskResponse> reorder(UUID projectId, TaskStatus status, TaskReorderRequest request) {
        if (request.taskIds() == null || request.taskIds().isEmpty()) {
            throw new IllegalArgumentException("taskIds is required");
        }
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));

        List<Task> columnTasks = taskRepository.search(null, projectId, false, "").stream()
                .filter(task -> task.getStatus() == status)
                .sorted(Task::compareForBoard)
                .toList();

        Map<UUID, Task> byId = new LinkedHashMap<>();
        columnTasks.forEach(task -> byId.put(task.getId(), task));

        // Chỉ áp dụng cho task thật sự thuộc cột này (bỏ qua id lạ để không lệch dữ liệu)
        List<Task> ordered = request.taskIds().stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (ordered.isEmpty()) {
            throw new IllegalArgumentException("No tasks of this column were found in the request");
        }

        for (int index = 0; index < ordered.size(); index++) {
            ordered.get(index).setPosition(index);
        }
        List<Task> untouched = columnTasks.stream()
                .filter(task -> !ordered.contains(task))
                .toList();
        for (int index = 0; index < untouched.size(); index++) {
            untouched.get(index).setPosition(ordered.size() + index);
        }

        List<Task> toSave = new ArrayList<>(ordered);
        toSave.addAll(untouched);
        taskRepository.saveAll(toSave);

        return toSave.stream()
                .sorted(Task::compareForBoard)
                .map(entityMapper::toTaskResponse)
                .toList();
    }

    @Override
    public ProjectMemberResponse ensureMember(Project project, User user) {
        return projectMemberRepository.findByProjectIdAndUserId(project.getId(), user.getId())
                .map(ProjectMemberResponse::fromEntity)
                .orElseGet(() -> {
                    ProjectMember member = new ProjectMember();
                    member.setProject(project);
                    member.setUser(user);
                    member.setRole(project.getOwner() != null
                            && project.getOwner().getId().equals(user.getId())
                            ? ProjectMemberRole.PROJECT_MANAGER
                            : ProjectMemberRole.MEMBER);
                    ProjectMember saved = projectMemberRepository.save(member);
                    project.setMemberCount((int) projectMemberRepository.countByProjectId(project.getId()));
                    projectRepository.save(project);
                    return ProjectMemberResponse.fromEntity(saved);
                });
    }

    @Override
    public User resolveAssigneeByEmail(UUID projectId, String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("No account uses the email " + email));
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));
        ensureMember(project, user);
        return user;
    }

    private void repositionAtEnd(UUID projectId, TaskStatus status, UUID taskId) {
        List<Task> columnTasks = taskRepository.search(null, projectId, false, "").stream()
                .filter(task -> task.getStatus() == status)
                .filter(task -> !task.getId().equals(taskId))
                .sorted(Comparator.comparingInt(Task::getPosition))
                .toList();

        for (int index = 0; index < columnTasks.size(); index++) {
            columnTasks.get(index).setPosition(index);
        }
        taskRepository.saveAll(columnTasks);

        Task moved = taskRepository.findById(taskId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Task not found: " + taskId));
        moved.setPosition(columnTasks.size());
        taskRepository.save(moved);
    }

    private void syncProjectTaskCount(Project project) {
        if (project == null) {
            return;
        }
        project.setTaskCount((int) taskRepository.countByProjectIdAndArchivedFalse(project.getId()));
        projectRepository.save(project);
    }

    private Task findTask(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("taskId is required");
        }
        return taskRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Task not found: " + id));
    }

    static String label(TaskStatus status) {
        return Arrays.stream(status.name().toLowerCase().split("_"))
                .filter(word -> !word.isEmpty())
                .map(word -> Character.toUpperCase(word.charAt(0)) + word.substring(1))
                .collect(java.util.stream.Collectors.joining(" "));
    }
}
