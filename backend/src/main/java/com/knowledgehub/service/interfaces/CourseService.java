package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.CourseCreateRequest;
import com.knowledgehub.dto.request.CourseUpdateRequest;
import com.knowledgehub.dto.response.CourseResponse;

import java.util.List;
import java.util.UUID;

/**
 * Khóa học của Academy Hub (tab Courses).
 *
 * @param status "completed" | "in_progress" | null (tất cả)
 * @param search khớp code hoặc title, null/"" = không lọc
 */
public interface CourseService {

    List<CourseResponse> getCourses(UUID ownerId, UUID workspaceId, String status, String search);

    CourseResponse getCourse(UUID courseId);

    CourseResponse create(UUID ownerId, CourseCreateRequest request);

    CourseResponse update(UUID courseId, CourseUpdateRequest changes);

    void delete(UUID courseId);

    /**
     * Bỏ khóa học khỏi danh sách của mình (soft delete, giữ tài liệu gốc).
     */
    void leave(UUID courseId);
}
