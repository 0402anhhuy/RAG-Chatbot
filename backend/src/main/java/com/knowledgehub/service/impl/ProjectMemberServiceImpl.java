package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.ProjectMemberAddRequest;
import com.knowledgehub.dto.response.ProjectMemberDetailResponse;
import com.knowledgehub.dto.response.ProjectMemberResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProjectMember;
import com.knowledgehub.entity.ProjectMemberRole;
import com.knowledgehub.entity.Task;
import com.knowledgehub.entity.User;
import com.knowledgehub.repository.ProjectMemberRepository;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.TaskRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.ProjectMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class ProjectMemberServiceImpl implements ProjectMemberService {

    private static final int SEARCH_LIMIT = 20;

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMemberDetailResponse> getByProject(UUID projectId) {
        Project project = findProject(projectId);
        return memberRepository.findByProjectIdOrderByJoinedAtAsc(projectId).stream()
                .map(member -> toDetail(member, project))
                .sorted(Comparator.comparing(ProjectMemberDetailResponse::owner).reversed())
                .toList();
    }

    @Override
    public ProjectMemberDetailResponse add(UUID projectId, ProjectMemberAddRequest request) {
        Project project = findProject(projectId);
        User user = resolveUser(request);
        if (!user.isActive()) {
            throw new IllegalArgumentException("Account " + user.getEmail() + " is deactivated");
        }
        if (memberRepository.existsByProjectIdAndUserId(projectId, user.getId())) {
            throw new IllegalArgumentException(user.getName() + " is already a member of this project");
        }

        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(user);
        member.setRole(isOwner(project, user) ? ProjectMemberRole.PROJECT_MANAGER : request.role());
        ProjectMember saved = memberRepository.save(member);

        syncMemberCount(project);
        return toDetail(saved, project);
    }

    @Override
    public ProjectMemberDetailResponse updateRole(UUID projectId, UUID memberId, ProjectMemberRole role) {
        Project project = findProject(projectId);
        ProjectMember member = findMember(projectId, memberId);
        if (isOwner(project, member.getUser())) {
            throw new IllegalArgumentException("The project owner's role cannot be changed");
        }
        member.setRole(role);
        return toDetail(memberRepository.save(member), project);
    }

    @Override
    public void remove(UUID projectId, UUID memberId) {
        Project project = findProject(projectId);
        ProjectMember member = findMember(projectId, memberId);
        if (isOwner(project, member.getUser())) {
            throw new IllegalArgumentException("The project owner cannot be removed");
        }

        // Bỏ gán các task đang thuộc member này để không còn task trỏ tới user đã rời project
        List<Task> assignedTasks = taskRepository.search(null, projectId, false, "").stream()
                .filter(task -> task.getAssignee() != null
                        && task.getAssignee().getId().equals(member.getUser().getId()))
                .toList();
        assignedTasks.forEach(task -> task.setAssignee(null));
        taskRepository.saveAll(assignedTasks);

        memberRepository.delete(member);
        syncMemberCount(project);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> searchCandidates(UUID projectId, String keyword) {
        Project project = findProject(projectId);
        String needle = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        return userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> !memberRepository.existsByProjectIdAndUserId(projectId, user.getId()))
                .filter(user -> needle.isEmpty()
                        || contains(user.getName(), needle)
                        || contains(user.getEmail(), needle))
                .limit(SEARCH_LIMIT)
                .map(UserResponse::fromEntity)
                .toList();
    }

    private ProjectMemberDetailResponse toDetail(ProjectMember member, Project project) {
        ProjectMemberResponse base = ProjectMemberResponse.fromEntity(member);
        // Owner luôn có toàn quyền: mặc định vai trò hiển thị là Project Manager
        boolean owner = isOwner(project, member.getUser());
        ProjectMemberRole role = owner ? ProjectMemberRole.PROJECT_MANAGER : member.getRole();
        return ProjectMemberDetailResponse.fromEntity(base, role, roleLabel(role), owner);
    }

    private User resolveUser(ProjectMemberAddRequest request) {
        if (request.hasUser()) {
            return userRepository.findById(request.userId())
                    .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + request.userId()));
        }
        if (request.hasEmail()) {
            return userRepository.findByEmailIgnoreCase(request.email().trim())
                    .orElseThrow(() -> new ServiceEntityNotFoundException(
                            "No account uses the email " + request.email()));
        }
        throw new IllegalArgumentException("userId or email is required");
    }

    private ProjectMember findMember(UUID projectId, UUID memberId) {
        ProjectMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Member not found: " + memberId));
        if (!member.getProject().getId().equals(projectId)) {
            throw new ServiceEntityNotFoundException("Member not found in project: " + memberId);
        }
        return member;
    }

    private Project findProject(UUID projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));
    }

    private boolean isOwner(Project project, User user) {
        return project.getOwner() != null
                && user != null
                && Objects.equals(project.getOwner().getId(), user.getId());
    }

    private void syncMemberCount(Project project) {
        project.setMemberCount((int) memberRepository.countByProjectId(project.getId()));
        projectRepository.save(project);
    }

    private boolean contains(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }

    static String roleLabel(ProjectMemberRole role) {
        if (role == null) {
            return null;
        }
        return java.util.Arrays.stream(role.name().toLowerCase(Locale.ROOT).split("_"))
                .filter(word -> !word.isEmpty())
                .map(word -> Character.toUpperCase(word.charAt(0)) + word.substring(1))
                .collect(java.util.stream.Collectors.joining(" "));
    }
}
