package com.knowledgehub.dto.response;

import java.util.List;

/**
 * Số liệu cho tab Dashboard của project. Mọi con số đều đếm từ DB, không có giá
 * trị mặc định giả.
 *
 * @param completedToday số task chuyển sang COMPLETED trong ngày hôm nay
 * @param viewerName tên hiển thị của người đang xem (cho lời chào)
 * @param myTasks task đang giao cho người xem ở các cột chưa xong
 */
public record ProjectDashboardResponse(
        String projectName,
        int members,
        int tasks,
        int completedToday,
        String viewerName,
        List<TaskResponse> myTasks) {

}
