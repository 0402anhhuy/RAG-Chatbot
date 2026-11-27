package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.ProjectLlmCredentialRequest;
import com.knowledgehub.dto.request.ProjectSettingUpdateRequest;
import com.knowledgehub.dto.response.ArchivedTaskResponse;
import com.knowledgehub.dto.response.ProjectDashboardResponse;
import com.knowledgehub.dto.response.ProjectSettingResponse;
import com.knowledgehub.dto.response.TaskResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProjectLlmCredential;
import com.knowledgehub.entity.ProjectSetting;
import com.knowledgehub.entity.ProviderEndpoint;
import com.knowledgehub.entity.ProviderModel;
import com.knowledgehub.entity.ProviderType;
import com.knowledgehub.entity.Task;
import com.knowledgehub.entity.User;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.ProjectLlmCredentialRepository;
import com.knowledgehub.repository.ProjectMemberRepository;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.ProjectSettingRepository;
import com.knowledgehub.repository.TaskRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.ProjectSettingService;
import com.knowledgehub.service.interfaces.ProviderCredentialResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class ProjectSettingServiceImpl implements ProjectSettingService {

    private static final ZoneId ZONE = ZoneId.systemDefault();

    private final ProjectRepository projectRepository;
    private final ProjectSettingRepository settingRepository;
    private final ProjectLlmCredentialRepository credentialRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final EntityMapper entityMapper;
    private final ProviderCredentialResolver providerCredentialResolver;

    // --------------------------------------------------------------- settings
    @Override
    @Transactional(readOnly = true)
    public ProjectSettingResponse getSettings(UUID projectId) {
        Project project = findProject(projectId);
        ProjectSetting setting = settingRepository.findByProjectId(projectId).orElse(null);
        return toResponse(project, setting);
    }

    @Override
    public ProjectSettingResponse updateSettings(UUID projectId, ProjectSettingUpdateRequest request) {
        Project project = findProject(projectId);

        // Tên project lưu ở bảng projects, các field còn lại ở project_settings.
        if (request.name() != null && !request.name().isBlank()) {
            project.setName(request.name().trim());
            project = projectRepository.save(project);
        }
        final Project target = project;

        ProjectSetting setting = settingRepository.findByProjectId(projectId)
                .orElseGet(() -> {
                    ProjectSetting created = new ProjectSetting();
                    created.setProject(target);
                    return created;
                });

        if (request.description() != null) {
            setting.setDescription(request.description().isBlank() ? null : request.description().trim());
        }
        if (request.excludedPaths() != null) {
            setting.setExcludedPaths(request.excludedPaths());
        }
        if (request.hoursPerDay() != null) {
            setting.setHoursPerDay(request.hoursPerDay());
        }
        if (request.daysPerMonth() != null) {
            setting.setDaysPerMonth(request.daysPerMonth());
        }
        if (request.referenceRate() != null) {
            setting.setReferenceRate(request.referenceRate());
        }
        if (request.allowStarterKit() != null) {
            setting.setAllowStarterKit(request.allowStarterKit());
        }
        if (request.allowPersonalProviders() != null) {
            setting.setAllowPersonalProviders(request.allowPersonalProviders());
        }
        if (request.budgetTrackingEnabled() != null) {
            setting.setBudgetTrackingEnabled(request.budgetTrackingEnabled());
        }
        if (request.monthlyBudgetLimit() != null) {
            setting.setMonthlyBudgetLimit(request.monthlyBudgetLimit());
        }

        ProjectSetting saved = settingRepository.save(setting);
        providerCredentialResolver.invalidate(projectId, null);
        return toResponse(project, saved);
    }

    // -------------------------------------------------------------- providers
    @Override
    public ProjectSettingResponse addProvider(UUID projectId, ProjectLlmCredentialRequest request) {
        Project project = findProject(projectId);
        if (request == null || request.provider() == null) {
            throw new IllegalArgumentException("provider is required");
        }
        String apiKey = request.apiKey() == null ? "" : request.apiKey().trim();
        if (apiKey.isEmpty()) {
            throw new IllegalArgumentException("API key is required");
        }

        ProjectLlmCredential credential = credentialRepository
                .findByProjectIdAndProviderType(projectId, request.provider())
                .orElseGet(() -> {
                    ProjectLlmCredential created = new ProjectLlmCredential();
                    created.setProject(project);
                    created.setProviderType(request.provider());
                    return created;
                });

        credential.setApiKey(apiKey);
        credential.setEndpointCode(resolveEndpoint(request.provider(), request.endpointCode()).name());
        credential.setModel(ProviderModel.resolveChatModel(request.provider(), request.model()));
        // "Add & Verify": key được coi là đã xác nhận ngay khi lưu thành công.
        credential.setVerified(true);
        credential.setLastVerifiedAt(Instant.now());
        credentialRepository.save(credential);
        providerCredentialResolver.invalidate(projectId, null);

        return getSettings(projectId);
    }

    @Override
    public ProjectSettingResponse removeProvider(UUID projectId, UUID credentialId) {
        findProject(projectId);
        ProjectLlmCredential credential = credentialRepository.findById(credentialId)
                .filter(item -> item.getProject() != null && item.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ServiceEntityNotFoundException("Provider not found: " + credentialId));
        credentialRepository.delete(credential);
        providerCredentialResolver.invalidate(projectId, null);
        return getSettings(projectId);
    }

    // --------------------------------------------------------------- archived
    @Override
    @Transactional(readOnly = true)
    public List<ArchivedTaskResponse> listArchivedTasks(UUID projectId) {
        findProject(projectId);
        return taskRepository.findByProjectIdAndArchivedTrueOrderByArchivedAtDesc(projectId)
                .stream()
                .map(ArchivedTaskResponse::fromEntity)
                .toList();
    }

    @Override
    public void unarchiveTask(UUID projectId, UUID taskId) {
        findProject(projectId);
        Task task = taskRepository.findById(taskId)
                .filter(item -> item.getProject() != null && item.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ServiceEntityNotFoundException("Task not found: " + taskId));
        if (!task.isArchived()) {
            return;
        }
        task.setArchived(false);
        task.setArchivedAt(null);
        taskRepository.save(task);

        Project project = task.getProject();
        project.setTaskCount((int) taskRepository.countByProjectIdAndArchivedFalse(projectId));
        projectRepository.save(project);
    }

    // -------------------------------------------------------------- dashboard
    @Override
    @Transactional(readOnly = true)
    public ProjectDashboardResponse getDashboard(UUID projectId, UUID viewerId) {
        Project project = findProject(projectId);

        int members = (int) projectMemberRepository.countByProjectId(projectId);
        int tasks = (int) taskRepository.countByProjectIdAndArchivedFalse(projectId);

        Instant startOfToday = LocalDate.now(ZONE).atStartOfDay(ZONE).toInstant();
        int completedToday = (int) taskRepository
                .countByProjectIdAndCompletedAtGreaterThanEqualAndArchivedFalse(projectId, startOfToday);

        User viewer = viewerId != null ? userRepository.findById(viewerId).orElse(null) : null;
        List<TaskResponse> myTasks = viewerId == null
                ? List.of()
                : taskRepository.findOpenTasksForAssignee(projectId, viewerId)
                        .stream()
                        .map(entityMapper::toTaskResponse)
                        .toList();

        return new ProjectDashboardResponse(
                project.getName(),
                members,
                tasks,
                completedToday,
                viewer != null ? viewer.getName() : null,
                myTasks);
    }

    // ---------------------------------------------------------------- helpers
    private ProjectSettingResponse toResponse(Project project, ProjectSetting setting) {
        List<ProjectLlmCredential> providers = credentialRepository
                .findByProjectIdOrderByProviderTypeAsc(project.getId());
        return ProjectSettingResponse.from(
                setting,
                project.getId(),
                project.getName(),
                project.getType(),
                project.getStatus(),
                project.getRepositoryUrl(),
                providers);
    }

    private ProviderEndpoint resolveEndpoint(ProviderType providerType, String endpointCode) {
        List<ProviderEndpoint> ofType = Arrays.stream(ProviderEndpoint.values())
                .filter(endpoint -> endpoint.getProviderType().equals(providerType.name()))
                .toList();
        if (ofType.isEmpty()) {
            throw new IllegalArgumentException("Provider has no configured endpoint: " + providerType);
        }
        if (endpointCode == null || endpointCode.isBlank()) {
            return ofType.get(0);
        }
        ProviderEndpoint endpoint = ProviderEndpoint.fromCode(endpointCode);
        if (endpoint == null || !endpoint.getProviderType().equals(providerType.name())) {
            throw new IllegalArgumentException("Endpoint does not belong to provider: " + endpointCode);
        }
        return endpoint;
    }

    private Project findProject(UUID projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));
    }
}
