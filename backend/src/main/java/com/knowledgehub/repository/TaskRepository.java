package com.knowledgehub.repository;

import com.knowledgehub.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    @Query("""
            SELECT t FROM Task t
            WHERE (:ownerId IS NULL OR t.project.owner.id = :ownerId)
              AND (:projectId IS NULL OR t.project.id = :projectId)
              AND (:archived IS NULL OR t.archived = :archived)
              AND (
                    :search = ''
                    OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(t.project.name) LIKE LOWER(CONCAT('%', :search, '%'))
                  )
            ORDER BY t.updatedAt DESC
            """)
    List<Task> search(
            @Param("ownerId") UUID ownerId,
            @Param("projectId") UUID projectId,
            @Param("archived") Boolean archived,
            @Param("search") String search);

    long countByProjectIdAndArchivedFalse(UUID projectId);

    /** Task của một người trong project, còn mở (chưa xong, chưa archive). */
    @Query("""
            SELECT t FROM Task t
            WHERE t.project.id = :projectId
              AND t.assignee.id = :assigneeId
              AND t.archived = false
              AND t.status <> com.knowledgehub.entity.TaskStatus.COMPLETED
            ORDER BY t.updatedAt DESC
            """)
    List<Task> findOpenTasksForAssignee(
            @Param("projectId") UUID projectId,
            @Param("assigneeId") UUID assigneeId);

    /** Đếm task chuyển sang COMPLETED kể từ :since (dùng cho "Completed today"). */
    long countByProjectIdAndCompletedAtGreaterThanEqualAndArchivedFalse(UUID projectId, Instant since);

    /** Task đã archive của project, mới nhất trước (Settings → Archived). */
    List<Task> findByProjectIdAndArchivedTrueOrderByArchivedAtDesc(UUID projectId);

    long countByProjectOwnerIdAndArchivedFalse(UUID ownerId);

    void deleteByProjectId(UUID projectId);
}
