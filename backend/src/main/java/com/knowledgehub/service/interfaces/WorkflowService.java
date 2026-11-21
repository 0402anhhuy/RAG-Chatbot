package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.WorkflowCreateRequest;
import com.knowledgehub.dto.request.WorkflowUpdateRequest;
import com.knowledgehub.dto.response.WorkflowResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.WorkflowType;

import java.util.List;
import java.util.UUID;

public interface WorkflowService {

    List<WorkflowResponse> getByProject(UUID projectId, WorkflowType type);

    WorkflowResponse get(UUID projectId, UUID workflowId);

    WorkflowResponse create(UUID projectId, WorkflowCreateRequest request);

    WorkflowResponse update(UUID projectId, UUID workflowId, WorkflowUpdateRequest changes);

    void delete(UUID projectId, UUID workflowId);

    /**
     * Tạo sẵn bộ workflow BUILT_IN cho project (idempotent, dựa vào
     * templateKey).
     */
    void seedBuiltInTemplates(Project project);
}
