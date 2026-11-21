package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.AcademyToolRunRequest;
import com.knowledgehub.dto.response.AcademyToolContextResponse;
import com.knowledgehub.dto.response.AcademyToolsResponse;

import java.util.List;
import java.util.UUID;

/**
 * Công cụ học tập của tab Tools (Academy Hub).
 *
 * <p>
 * Mọi phương thức đều giới hạn dữ liệu theo user (các workspace thuộc user đó),
 * không dựa vào tham số do client gửi.
 * </p>
 */
public interface AcademyToolService {

    /**
     * Catalog 4 công cụ kèm số liệu thật từ các lượt chạy và tài liệu đã index.
     */
    AcademyToolsResponse getTools(UUID userId);

    /**
     * Ngữ cảnh mở một tool: danh sách tài liệu có thể chọn làm nguồn.
     *
     * @param toolId tutor | exam_prep | grader | courseware
     */
    AcademyToolContextResponse getContext(UUID userId, String toolId, UUID workspaceId);

    /**
     * Chạy tool và trả kết quả của đúng lượt chạy đó.
     */
    AcademyToolsResponse.RunResult run(
            UUID userId, String toolId, UUID workspaceId, AcademyToolRunRequest request);

    /**
     * Xem lại lượt chạy gần nhất của một tool (null nếu chưa chạy lần nào).
     */
    AcademyToolsResponse.RunResult getLatestRun(UUID userId, String toolId);

    /**
     * Các lượt chạy gần đây của một tool, mới nhất trước.
     *
     * @param limit số lượt tối đa (mặc định 20, tối đa 50)
     */
    List<AcademyToolsResponse.RunResult> listRuns(UUID userId, String toolId, Integer limit);
}
