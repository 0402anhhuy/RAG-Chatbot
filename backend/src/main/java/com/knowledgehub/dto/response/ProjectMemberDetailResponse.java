package com.knowledgehub.dto.response;

import com.knowledgehub.entity.ProjectMemberRole;

import java.time.Instant;
import java.util.UUID;

/**
 * Thành viên của project trả về cho tab "Project Members".
 *
 * @param id id của bản ghi project_members (dùng cho API đổi role / xoá)
 * @param userId id tài khoản người dùng
 * @param name tên hiển thị
 * @param email email tài khoản
 * @param role vai trò trong project
 * @param roleLabel nhãn hiển thị của role, vd PROJECT_MANAGER -> "Project
 * Manager"
 * @param owner true nếu đây là chủ dự án (không cho xoá/đổi role)
 * @param joinedAt thời điểm tham gia project
 */
public record ProjectMemberDetailResponse(
        UUID id,
        UUID userId,
        String name,
        String email,
        ProjectMemberRole role,
        String roleLabel,
        boolean owner,
        Instant joinedAt) {

    public static ProjectMemberDetailResponse fromEntity(
            ProjectMemberResponse member, ProjectMemberRole role, String roleLabel, boolean owner) {
        return new ProjectMemberDetailResponse(
                member.id(),
                member.userId(),
                member.name(),
                member.email(),
                role,
                roleLabel,
                owner,
                member.joinedAt());
    }
}
