package com.knowledgehub.dto.request;

import com.knowledgehub.entity.ProjectMemberRole;
import jakarta.validation.constraints.NotNull;

public record ProjectMemberRoleUpdateRequest(
        @NotNull(message = "role không được để trống")
        ProjectMemberRole role) {

}
