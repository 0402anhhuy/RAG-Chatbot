package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.TaskMoveRequest;
import com.knowledgehub.dto.request.TaskReorderRequest;
import com.knowledgehub.dto.response.KanbanBoardResponse;
import com.knowledgehub.dto.response.ProjectMemberResponse;
import com.knowledgehub.dto.response.TaskResponse;
import com.knowledgehub.entity.Project;
import com.knowledgehub.entity.TaskStatus;
import com.knowledgehub.entity.User;

import java.util.List;
import java.util.UUID;

public interface KanbanService {

    KanbanBoardResponse getBoard(UUID projectId);

    TaskResponse move(UUID taskId, TaskMoveRequest request);

    List<TaskResponse> reorder(UUID projectId, TaskStatus status, TaskReorderRequest request);

    ProjectMemberResponse ensureMember(Project project, User user);

    User resolveAssigneeByEmail(UUID projectId, String email);
}
