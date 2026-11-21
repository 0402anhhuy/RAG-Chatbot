package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.response.AcademyHomeResponse;

import java.util.UUID;

/**
 * Dashboard của tab Home (Academy Hub).
 *
 * <p>
 * Không có bảng riêng cho Home: số liệu được tổng hợp từ courses, quizzes,
 * attempts, chat messages, study notes và academy settings của cùng workspace,
 * nên Home luôn phản ánh dữ liệu thật của các tab khác.
 * </p>
 */
public interface AcademyHomeService {

    /**
     * @param ownerId user hiện tại; dùng để tìm workspace học tập nếu FE chưa
     * biết workspaceId
     * @param workspaceId workspace đang mở trong Academy Hub
     * @param range 7d | 30d | all — khoảng thời gian cho KPI "Study Time"
     */
    AcademyHomeResponse getHome(UUID ownerId, UUID workspaceId, String range);
}
