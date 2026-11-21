package com.knowledgehub.repository;

import com.knowledgehub.entity.WorkbenchFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkbenchFileRepository extends JpaRepository<WorkbenchFile, UUID> {

    List<WorkbenchFile> findByProjectIdOrderByPathAsc(UUID projectId);

    Optional<WorkbenchFile> findByProjectIdAndPath(UUID projectId, String path);

    boolean existsByProjectIdAndPath(UUID projectId, String path);

    long countByProjectId(UUID projectId);

    void deleteByProjectId(UUID projectId);
}
