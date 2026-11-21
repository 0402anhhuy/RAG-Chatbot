package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.ProjectMemberAddRequest;
import com.knowledgehub.dto.response.ProjectMemberDetailResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.ProjectMemberRole;

import java.util.List;
import java.util.UUID;

/**
 * Quản lý thành viên của một project (tab "Project Members").
 */
public interface ProjectMemberService {

    List<ProjectMemberDetailResponse> getByProject(UUID projectId);

    ProjectMemberDetailResponse add(UUID projectId, ProjectMemberAddRequest request);

    ProjectMemberDetailResponse updateRole(UUID projectId, UUID memberId, ProjectMemberRole role);

    void remove(UUID projectId, UUID memberId);

    /**
     * Tìm tài khoản có thể thêm vào project (theo tên hoặc email).
     */
    List<UserResponse> searchCandidates(UUID projectId, String keyword);
}
