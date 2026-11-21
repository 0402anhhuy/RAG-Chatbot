package com.knowledgehub.repository;

import com.knowledgehub.entity.StudyNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StudyNoteRepository extends JpaRepository<StudyNote, UUID> {

    List<StudyNote> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    long countByWorkspaceId(UUID workspaceId);

    /**
     * Ngày tạo các ghi chú của workspace — dựng chuỗi ngày học ở navbar.
     */
    @org.springframework.data.jpa.repository.Query(
            "select n.createdAt from StudyNote n where n.workspace.id = :workspaceId")
    List<java.time.Instant> findCreatedAtByWorkspaceId(
            @org.springframework.data.repository.query.Param("workspaceId") UUID workspaceId);

    long countByWorkspaceIdAndCreatedAtGreaterThanEqual(UUID workspaceId, java.time.Instant since);

    void deleteByWorkspaceId(UUID workspaceId);
}
