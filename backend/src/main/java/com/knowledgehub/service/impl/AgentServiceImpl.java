package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.AgentCreateRequest;
import com.knowledgehub.dto.request.AgentUpdateRequest;
import com.knowledgehub.dto.response.AgentResponse;
import com.knowledgehub.entity.AgentType;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProjectAgent;
import com.knowledgehub.repository.ProjectAgentRepository;
import com.knowledgehub.repository.ProjectRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class AgentServiceImpl implements AgentService {

    private static final String DEFAULT_COLOR = "#3B82F6";
    private static final String DEFAULT_ICON = "bot";
    private static final String DEFAULT_PERMISSION = "Scoped edits";

    /**
     * Bộ agent dựng sẵn: key, tên, mô tả, màu, icon, permission.
     */
    private record BuiltInAgent(
            String key, String name, String description, String color, String iconKey, String permission) {

    }

    private static final List<BuiltInAgent> BUILT_IN_AGENTS = List.of(
            new BuiltInAgent("business-analyst", "business-analyst",
                    "Business Analyst - Cross-industry requirements, SRS, user stories, process modeling",
                    "#3B82F6", "file", "Scoped edits"),
            new BuiltInAgent("slide-craft", "slide-craft",
                    "Presentation Designer — generates self-contained 16:9 slide decks (HTML + PDF + PPTX) "
                    + "from documents, RFPs, or topics",
                    "#EC4899", "monitor", "Scoped edits"),
            new BuiltInAgent("project-manager", "project-manager",
                    "Project Manager - Planning, WBS, timeline, risk management, sprint planning",
                    "#10B981", "columns", "Docs writer"),
            new BuiltInAgent("solution-architect", "solution-architect",
                    "Solution Architect - System design, data architecture, infrastructure planning, and ADR",
                    "#8B5CF6", "network", "Scoped edits"),
            new BuiltInAgent("dba-expert", "dba-expert",
                    "DBA Expert - Query tuning, schema design, replication, all database engines",
                    "#EC4899", "db", "Docs writer"),
            new BuiltInAgent("security-auditor", "security-auditor",
                    "Security Auditor - White-box security code review (OWASP Top 10 Web + API, CWE, CVSS): "
                    + "finds vulnerabilities with exact file:line, exploit scenario, and a working fix, "
                    + "then writes a report",
                    "#EF4444", "shield", "Scoped edits"),
            new BuiltInAgent("document-to-md", "document-to-md",
                    "Convert source documents (PDF, Word, Excel, PowerPoint) to Markdown using the matching "
                    + "skill (pdf/docx/xlsx/pptx), with selective diagram/figure rasterization to PNG",
                    "#EF4444", "file-plus", "Scoped edits"),
            new BuiltInAgent("migration-expert", "migration-expert",
                    "Migration Expert - System, code, data, and platform migration strategies",
                    "#F97316", "git", "Scoped edits"),
            new BuiltInAgent("docs-drift", "docs-drift",
                    "Docs Drift Auditor — audits the docs against the code and fixes stale references "
                    + "(renamed symbols, moved files, dead links, outdated commands), report-first",
                    "#0EA5E9", "search", "Scoped edits"),
            new BuiltInAgent("reviewer", "reviewer",
                    "Reviewer - Code review (all stacks) and document review (SRS, RFP, design docs)",
                    "#EF4444", "scan", "Scoped edits"),
            new BuiltInAgent("backend-dev", "backend-dev",
                    "Backend Developer - Implements APIs and business logic across all backend stacks",
                    "#F59E0B", "server", "Full access"),
            new BuiltInAgent("revert-expert", "revert-expert",
                    "Reverse Engineering Expert - Legacy code analysis, documentation extraction, and "
                    + "modernization strategy",
                    "#8B5CF6", "refresh", "Scoped edits"),
            new BuiltInAgent("cloud-expert", "cloud-expert",
                    "Cloud Expert - AWS, Azure, GCP, Alibaba Cloud, OCI, Kubernetes, Terraform",
                    "#06B6D4", "cloud", "Scoped edits"),
            new BuiltInAgent("frontend-dev", "frontend-dev",
                    "Frontend Developer - Implements UI components and features across all frontend stacks",
                    "#10B981", "palette", "Full access"),
            new BuiltInAgent("tester", "tester",
                    "Tester - Write test cases (IPA standard or your template) and execute them against a "
                    + "running web app (Playwright), reporting pass/fail per TC-ID",
                    "#84CC16", "test-tube", "Scoped edits"));

    private final ProjectRepository projectRepository;
    private final ProjectAgentRepository agentRepository;

    @Override
    public List<AgentResponse> getByProject(UUID projectId, AgentType type) {
        Project project = findProject(projectId);
        seedBuiltInTemplates(project);

        List<ProjectAgent> agents = agentRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        return agents.stream()
                .filter(agent -> type == null || agent.getType() == type)
                .map(AgentResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AgentResponse get(UUID projectId, UUID agentId) {
        return AgentResponse.fromEntity(findAgent(projectId, agentId));
    }

    @Override
    public AgentResponse create(UUID projectId, AgentCreateRequest request) {
        Project project = findProject(projectId);

        ProjectAgent agent = new ProjectAgent();
        agent.setProject(project);
        agent.setName(request.name().trim());
        agent.setDescription(trimToNull(request.description()));
        agent.setType(AgentType.CUSTOM);
        agent.setColor(hasText(request.color()) ? request.color() : DEFAULT_COLOR);
        agent.setIconKey(hasText(request.iconKey()) ? request.iconKey().trim() : DEFAULT_ICON);
        agent.setPermissionPreset(hasText(request.permissions())
                ? request.permissions().trim()
                : DEFAULT_PERMISSION);
        agent.setPrompt(trimToNull(request.prompt()));

        return AgentResponse.fromEntity(agentRepository.save(agent));
    }

    @Override
    public AgentResponse update(UUID projectId, UUID agentId, AgentUpdateRequest changes) {
        ProjectAgent agent = findAgent(projectId, agentId);
        ensureEditable(agent);

        if (hasText(changes.name())) {
            agent.setName(changes.name().trim());
        }
        if (changes.description() != null) {
            agent.setDescription(trimToNull(changes.description()));
        }
        if (hasText(changes.color())) {
            agent.setColor(changes.color());
        }
        if (hasText(changes.iconKey())) {
            agent.setIconKey(changes.iconKey().trim());
        }
        if (hasText(changes.permissions())) {
            agent.setPermissionPreset(changes.permissions().trim());
        }
        if (changes.prompt() != null) {
            agent.setPrompt(trimToNull(changes.prompt()));
        }
        return AgentResponse.fromEntity(agentRepository.save(agent));
    }

    @Override
    public void delete(UUID projectId, UUID agentId) {
        ProjectAgent agent = findAgent(projectId, agentId);
        ensureEditable(agent);
        agentRepository.delete(agent);
    }

    @Override
    public void seedBuiltInTemplates(Project project) {
        if (project == null || project.getId() == null) {
            return;
        }
        List<ProjectAgent> missing = new ArrayList<>();
        for (BuiltInAgent template : BUILT_IN_AGENTS) {
            if (agentRepository.findByProjectIdAndTemplateKey(project.getId(), template.key()).isEmpty()) {
                ProjectAgent agent = new ProjectAgent();
                agent.setProject(project);
                agent.setName(template.name());
                agent.setDescription(template.description());
                agent.setType(AgentType.BUILT_IN);
                agent.setTemplateKey(template.key());
                agent.setColor(template.color());
                agent.setIconKey(template.iconKey());
                agent.setPermissionPreset(template.permission());
                missing.add(agent);
            }
        }
        if (!missing.isEmpty()) {
            agentRepository.saveAll(missing);
        }
    }

    private void ensureEditable(ProjectAgent agent) {
        if (agent.getType() == AgentType.BUILT_IN) {
            throw new IllegalArgumentException("Built-in agents cannot be changed or deleted");
        }
    }

    private ProjectAgent findAgent(UUID projectId, UUID agentId) {
        if (agentId == null) {
            throw new IllegalArgumentException("agentId is required");
        }
        return agentRepository.findByIdAndProjectId(agentId, projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Agent not found: " + agentId));
    }

    private Project findProject(UUID projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + projectId));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
