package com.knowledgehub.repository;

import com.knowledgehub.entity.ChatSession;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    List<ChatSession> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);

    List<ChatSession> findByWorkspaceIdOrderByUpdatedAtDesc(UUID workspaceId);

    List<ChatSession> findByOwnerId(UUID ownerId);

    List<ChatSession> findByWorkspaceId(UUID workspaceId);

    long countByOwnerId(UUID ownerId);

    long countByOwnerIdAndArchived(UUID ownerId, boolean archived);

    @Query("""
            select s from ChatSession s
            left join s.project p
            left join s.workspace w
            where (:ownerId is null or s.owner.id = :ownerId)
              and (:archived is null or s.archived = :archived)
              and (:search is null or :search = ''
                   or lower(s.title) like lower(concat('%', :search, '%'))
                   or lower(coalesce(p.name, '')) like lower(concat('%', :search, '%'))
                   or lower(coalesce(w.name, '')) like lower(concat('%', :search, '%')))
              and (:projectId is null or p.id = :projectId)
            """)
    Page<ChatSession> search(
            @Param("ownerId") UUID ownerId,
            @Param("archived") Boolean archived,
            @Param("search") String search,
            @Param("projectId") UUID projectId,
            Pageable pageable);

    @Query("""
            select s from ChatSession s
            left join s.project p
            left join s.workspace w
            where s.owner.id = :ownerId
              and (lower(s.title) like lower(concat('%', :search, '%'))
                   or lower(coalesce(p.name, '')) like lower(concat('%', :search, '%'))
                   or lower(coalesce(w.name, '')) like lower(concat('%', :search, '%')))
            order by s.updatedAt desc
            """)
    List<ChatSession> searchAll(@Param("ownerId") UUID ownerId, @Param("search") String search);
}
