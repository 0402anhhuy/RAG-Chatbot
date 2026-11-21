package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.WorkflowCreateRequest;
import com.knowledgehub.dto.request.WorkflowUpdateRequest;
import com.knowledgehub.dto.response.WorkflowResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProjectWorkflow;
import com.knowledgehub.entity.WorkflowType;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.repository.ProjectWorkflowRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class WorkflowServiceImpl implements WorkflowService {

    private static final String DEFAULT_COLOR = "#3B82F6";
    private static final String DEFAULT_ICON = "layers";

    /**
     * Bộ mẫu dựng sẵn: key, tên, các bước, số node, màu, icon.
     */
    private record BuiltInTemplate(
            String key, String name, String steps, int nodeCount, String color, String iconKey) {

    }

    private static final List<BuiltInTemplate> BUILT_IN_TEMPLATES = List.of(
            new BuiltInTemplate("rfp-to-demo", "RFP to Demo",
                    "PDF → PM → (SA || Cloud) → PM Review → Slides → (Backend || Frontend)",
                    6, "#06B6D4", "monitor"),
            new BuiltInTemplate("rfp-to-proposal", "RFP to Proposal",
                    "PDF → PM → (SA || Cloud) → PM Review → Slides (no code demo)",
                    5, "#6366F1", "columns"),
            new BuiltInTemplate("bug-fix-pipeline", "Bug Fix Pipeline",
                    "Analyze → Fix → Test || Review", 3, "#EF4444", "bug"),
            new BuiltInTemplate("code-review-pipeline", "Code Review Pipeline",
                    "Static Analysis || AI Review → Summary", 2, "#F59E0B", "code"),
            new BuiltInTemplate("db-migration-pipeline", "DB Migration Pipeline",
                    "Design → Generate → Test Rollback || Review", 3, "#EC4899", "db"),
            new BuiltInTemplate("feature-development", "Feature Development",
                    "Architect → Backend || Frontend → Review", 3, "#8B5CF6", "layers"),
            new BuiltInTemplate("full-stack-dev", "Full-Stack Development",
                    "Architect → Backend || Frontend → Integration Test → Review", 4, "#0284C7", "layers"),
            new BuiltInTemplate("safe-refactor", "Safe Refactor",
                    "Snapshot Tests → Refactor → Run Tests || Diff Check", 3, "#10B981", "refresh"));

    private final ProjectRepository projectRepository;
    private final ProjectWorkflowRepository workflowRepository;

    @Override
    public List<WorkflowResponse> getByProject(UUID projectId, WorkflowType type) {
        Project project = findProject(projectId);
        seedBuiltInTemplates(project);

        List<ProjectWorkflow> workflows = workflowRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        return workflows.stream()
                .filter(workflow -> type == null || workflow.getType() == type)
                .map(WorkflowResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public WorkflowResponse get(UUID projectId, UUID workflowId) {
        return WorkflowResponse.fromEntity(findWorkflow(projectId, workflowId));
    }

    @Override
    public WorkflowResponse create(UUID projectId, WorkflowCreateRequest request) {
        Project project = findProject(projectId);

        ProjectWorkflow workflow = new ProjectWorkflow();
        workflow.setProject(project);
        workflow.setName(request.name().trim());
        workflow.setDescription(trimToNull(request.description()));
        workflow.setType(WorkflowType.CUSTOM);
        workflow.setColor(request.color() != null ? request.color() : DEFAULT_COLOR);
        workflow.setIconKey(request.iconKey() != null && !request.iconKey().isBlank()
                ? request.iconKey().trim()
                : DEFAULT_ICON);
        // Workflow mới chỉ có node khởi đầu (Start node)
        workflow.setNodeCount(1);
        workflow.setStepsSummary("Start → Draft steps");

        return WorkflowResponse.fromEntity(workflowRepository.save(workflow));
    }

    @Override
    public WorkflowResponse update(UUID projectId, UUID workflowId, WorkflowUpdateRequest changes) {
        ProjectWorkflow workflow = findWorkflow(projectId, workflowId);
        ensureEditable(workflow);

        if (changes.name() != null && !changes.name().isBlank()) {
            workflow.setName(changes.name().trim());
        }
        if (changes.description() != null) {
            workflow.setDescription(trimToNull(changes.description()));
        }
        if (changes.color() != null) {
            workflow.setColor(changes.color());
        }
        if (changes.iconKey() != null && !changes.iconKey().isBlank()) {
            workflow.setIconKey(changes.iconKey().trim());
        }
        return WorkflowResponse.fromEntity(workflowRepository.save(workflow));
    }

    @Override
    public void delete(UUID projectId, UUID workflowId) {
        ProjectWorkflow workflow = findWorkflow(projectId, workflowId);
        ensureEditable(workflow);
        workflowRepository.delete(workflow);
    }

    @Override
    public void seedBuiltInTemplates(Project project) {
        if (project == null || project.getId() == null) {
            return;
        }
        List<ProjectWorkflow> missing = new ArrayList<>();
        for (BuiltInTemplate template : BUILT_IN_TEMPLATES) {
            if (workflowRepository.findByProjectIdAndTemplateKey(project.getId(), template.key()).isEmpty()) {
                ProjectWorkflow workflow = new ProjectWorkflow();
                workflow.setProject(project);
                workflow.setName(template.name());
                workflow.setDescription("Built-in template: " + template.name());
                workflow.setType(WorkflowType.BUILT_IN);
                workflow.setTemplateKey(template.key());
                workflow.setStepsSummary(template.steps());
                workflow.setNodeCount(template.nodeCount());
                workflow.setColor(template.color());
                workflow.setIconKey(template.iconKey());
                missing.add(workflow);
            }
        }
        if (!missing.isEmpty()) {
            workflowRepository.saveAll(missing);
        }
    }

    private void ensureEditable(ProjectWorkflow workflow) {
        if (workflow.getType() == WorkflowType.BUILT_IN) {
            throw new IllegalArgumentException("Built-in workflows cannot be changed or deleted");
        }
    }

    private ProjectWorkflow findWorkflow(UUID projectId, UUID workflowId) {
        if (workflowId == null) {
            throw new IllegalArgumentException("workflowId is required");
        }
        return workflowRepository.findByIdAndProjectId(workflowId, projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Workflow not found: " + workflowId));
    }

    private Project findProject(UUID projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
