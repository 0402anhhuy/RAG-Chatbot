package com.knowledgehub.repository;

import com.knowledgehub.entity.ProjectLlmCredential;
import com.knowledgehub.entity.ProviderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectLlmCredentialRepository extends JpaRepository<ProjectLlmCredential, UUID> {

    List<ProjectLlmCredential> findByProjectIdOrderByProviderTypeAsc(UUID projectId);

    Optional<ProjectLlmCredential> findByProjectIdAndProviderType(UUID projectId, ProviderType providerType);

    void deleteByProjectId(UUID projectId);
}
