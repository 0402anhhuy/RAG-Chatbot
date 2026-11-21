package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.TaskCreateRequest;
import com.knowledgehub.dto.request.TaskMoveRequest;
import com.knowledgehub.dto.request.TaskReorderRequest;
import com.knowledgehub.dto.request.TaskUpdateRequest;
import com.knowledgehub.dto.response.TaskResponse;
import com.knowledgehub.entity.TaskStatus;

import java.util.List;
import java.util.UUID;

public interface TaskService {

    TaskResponse create(TaskCreateRequest request, UUID ownerId);

    TaskResponse getById(UUID id);

    List<TaskResponse> getTasks(UUID ownerId, UUID projectId, TaskStatus status, Boolean archived, String search);

    TaskResponse update(UUID id, TaskUpdateRequest changes);

    TaskResponse move(UUID id, TaskMoveRequest request);

    List<TaskResponse> reorder(UUID projectId, TaskStatus status, TaskReorderRequest request);

    TaskResponse archive(UUID id, boolean archived);

    void delete(UUID id);
}
