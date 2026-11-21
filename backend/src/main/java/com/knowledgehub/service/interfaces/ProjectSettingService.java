package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.ProjectLlmCredentialRequest;
import com.knowledgehub.dto.request.ProjectSettingUpdateRequest;
import com.knowledgehub.dto.response.ArchivedTaskResponse;
import com.knowledgehub.dto.response.ProjectDashboardResponse;
import com.knowledgehub.dto.response.ProjectSettingResponse;

import java.util.List;
import java.util.UUID;

/**
 * Dữ liệu cho tab Settings và Dashboard của một project.
 */
public interface ProjectSettingService {

    ProjectSettingResponse getSettings(UUID projectId);

    ProjectSettingResponse updateSettings(UUID projectId, ProjectSettingUpdateRequest request);

    ProjectSettingResponse addProvider(UUID projectId, ProjectLlmCredentialRequest request);

    ProjectSettingResponse removeProvider(UUID projectId, UUID credentialId);

    /**
     * Task đã archive của project (Settings → Archived).
     */
    List<ArchivedTaskResponse> listArchivedTasks(UUID projectId);

    /**
     * Đưa một task đã archive trở lại bảng Kanban.
     */
    void unarchiveTask(UUID projectId, UUID taskId);

    /**
     * KPI + My Tasks cho tab Dashboard. viewerId có thể null (ẩn My Tasks).
     */
    ProjectDashboardResponse getDashboard(UUID projectId, UUID viewerId);
}
