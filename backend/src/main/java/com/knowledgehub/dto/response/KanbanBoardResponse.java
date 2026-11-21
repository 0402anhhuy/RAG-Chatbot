package com.knowledgehub.dto.response;

import com.knowledgehub.entity.TaskStatus;

import java.util.List;
import java.util.UUID;

/**
 * Dữ liệu cho bảng Kanban: thông tin project + 4 cột (đầy đủ, kể cả cột rỗng) +
 * danh sách member để filter/assign.
 */
public record KanbanBoardResponse(
        UUID projectId,
        String projectName,
        List<Column> columns,
        List<ProjectMemberResponse> members) {

    public record Column(
            TaskStatus status,
            String label,
            int taskCount,
            List<TaskResponse> tasks) {

    }
}
