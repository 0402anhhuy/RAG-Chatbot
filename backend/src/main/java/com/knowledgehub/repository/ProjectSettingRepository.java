package com.knowledgehub.repository;

import com.knowledgehub.entity.ProjectSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProjectSettingRepository extends JpaRepository<ProjectSetting, UUID> {

    Optional<ProjectSetting> findByProjectId(UUID projectId);

    void deleteByProjectId(UUID projectId);
}
