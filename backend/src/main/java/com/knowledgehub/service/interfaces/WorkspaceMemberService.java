package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.WorkspaceMemberRequest;
import com.knowledgehub.dto.response.WorkspaceMemberResponse;
import com.knowledgehub.entity.WorkspaceMemberRole;
import java.util.List;
import java.util.UUID;

public interface WorkspaceMemberService {
    WorkspaceMemberResponse add(UUID workspaceId, WorkspaceMemberRequest request);
    List<WorkspaceMemberResponse> getByWorkspace(UUID workspaceId);
    List<WorkspaceMemberResponse> getByUser(UUID userId);
    WorkspaceMemberResponse get(UUID workspaceId, UUID userId);
    WorkspaceMemberResponse updateRole(UUID workspaceId, UUID userId, WorkspaceMemberRole role);
    void remove(UUID workspaceId, UUID userId);
}