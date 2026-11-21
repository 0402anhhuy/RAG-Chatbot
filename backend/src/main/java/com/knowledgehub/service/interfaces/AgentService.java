package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.AgentCreateRequest;
import com.knowledgehub.dto.request.AgentUpdateRequest;
import com.knowledgehub.dto.response.AgentResponse;
import com.knowledgehub.entity.AgentType;
import com.knowledgehub.entity.Project;

import java.util.List;
import java.util.UUID;

public interface AgentService {

    List<AgentResponse> getByProject(UUID projectId, AgentType type);

    AgentResponse get(UUID projectId, UUID agentId);

    AgentResponse create(UUID projectId, AgentCreateRequest request);

    AgentResponse update(UUID projectId, UUID agentId, AgentUpdateRequest changes);

    void delete(UUID projectId, UUID agentId);

    /**
     * Tạo sẵn bộ agent BUILT_IN cho project (idempotent, dựa vào templateKey).
     */
    void seedBuiltInTemplates(Project project);
}
