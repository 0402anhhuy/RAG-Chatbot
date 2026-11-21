package com.knowledgehub.repository;

import com.knowledgehub.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    List<Quiz> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    Optional<Quiz> findByIdAndWorkspaceId(UUID id, UUID workspaceId);

    long countByWorkspaceIdAndArchivedFalse(UUID workspaceId);

    void deleteByWorkspaceId(UUID workspaceId);
}
