package com.knowledgehub.repository;

import com.knowledgehub.entity.AgentType;
import com.knowledgehub.entity.ProjectAgent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectAgentRepository extends JpaRepository<ProjectAgent, UUID> {

    List<ProjectAgent> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    long countByProjectId(UUID projectId);

    long countByProjectIdAndType(UUID projectId, AgentType type);

    Optional<ProjectAgent> findByProjectIdAndTemplateKey(UUID projectId, String templateKey);

    Optional<ProjectAgent> findByIdAndProjectId(UUID id, UUID projectId);
}
