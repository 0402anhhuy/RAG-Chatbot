package com.knowledgehub.repository;

import com.knowledgehub.entity.ProjectWorkflow;
import com.knowledgehub.entity.WorkflowType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectWorkflowRepository extends JpaRepository<ProjectWorkflow, UUID> {

    List<ProjectWorkflow> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    long countByProjectId(UUID projectId);

    long countByProjectIdAndType(UUID projectId, WorkflowType type);

    Optional<ProjectWorkflow> findByProjectIdAndTemplateKey(UUID projectId, String templateKey);

    Optional<ProjectWorkflow> findByIdAndProjectId(UUID id, UUID projectId);
}
