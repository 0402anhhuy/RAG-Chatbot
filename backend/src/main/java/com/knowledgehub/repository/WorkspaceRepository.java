package com.knowledgehub.repository;

import com.knowledgehub.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {
    List<Workspace> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);
    List<Workspace> findByOwnerId(UUID ownerId);
}