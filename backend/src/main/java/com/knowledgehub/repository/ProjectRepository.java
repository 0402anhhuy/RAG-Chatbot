package com.knowledgehub.repository;

import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);
    List<Project> findByOwnerIdAndStatusOrderByUpdatedAtDesc(UUID ownerId, ProjectStatus status);
}
