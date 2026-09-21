package com.knowledgehub.repository;

import com.knowledgehub.entity.WorkspaceMember;
import com.knowledgehub.entity.WorkspaceMemberRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, UUID> {
    List<WorkspaceMember> findByWorkspaceId(UUID workspaceId);
    List<WorkspaceMember> findByUserId(UUID userId);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
    List<WorkspaceMember> findByWorkspaceIdAndRole(UUID workspaceId, WorkspaceMemberRole role);
}
