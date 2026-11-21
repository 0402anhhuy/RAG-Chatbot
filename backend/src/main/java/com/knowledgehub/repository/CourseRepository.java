package com.knowledgehub.repository;

import com.knowledgehub.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {

    List<Course> findByWorkspaceIdOrderByCreatedAtAsc(UUID workspaceId);

    List<Course> findByWorkspaceOwnerIdOrderByCreatedAtAsc(UUID ownerId);

    Optional<Course> findByIdAndWorkspaceId(UUID id, UUID workspaceId);

    Optional<Course> findByWorkspaceIdAndCodeIgnoreCase(UUID workspaceId, String code);

    boolean existsByWorkspaceIdAndCodeIgnoreCase(UUID workspaceId, String code);

    void deleteByWorkspaceId(UUID workspaceId);
}
