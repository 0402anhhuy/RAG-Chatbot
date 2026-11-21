package com.knowledgehub.controller.academyhub;

import com.knowledgehub.dto.request.CourseCreateRequest;
import com.knowledgehub.dto.request.CourseUpdateRequest;
import com.knowledgehub.dto.response.CourseResponse;
import com.knowledgehub.service.interfaces.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Khóa học của Academy Hub (tab Courses). Tài liệu học tập nằm trong
 * CourseResponse.materials và được lấy từ documents của cùng workspace.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/courses")
public class AcademyCourseController {

    private final CourseService courseService;

    /**
     * Danh sách khóa học. Truyền workspaceId, hoặc ownerId (khi FE chưa biết
     * workspace), hoặc cả hai.
     *
     * @param status completed | in_progress | để trống = tất cả
     */
    @GetMapping
    public ResponseEntity<List<CourseResponse>> list(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(courseService.getCourses(ownerId, workspaceId, status, search));
    }

    @GetMapping("/{courseId}")
    public ResponseEntity<CourseResponse> get(@PathVariable UUID courseId) {
        return ResponseEntity.ok(courseService.getCourse(courseId));
    }

    /**
     * "Join Course" — thêm khóa học vào danh sách của mình.
     */
    @PostMapping
    public ResponseEntity<CourseResponse> create(
            @RequestParam(required = false) UUID ownerId,
            @Valid @RequestBody CourseCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(courseService.create(ownerId, request));
    }

    @PatchMapping("/{courseId}")
    public ResponseEntity<CourseResponse> update(
            @PathVariable UUID courseId,
            @Valid @RequestBody CourseUpdateRequest changes) {
        return ResponseEntity.ok(courseService.update(courseId, changes));
    }

    @DeleteMapping("/{courseId}")
    public ResponseEntity<Void> delete(@PathVariable UUID courseId) {
        courseService.delete(courseId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Bỏ khóa khỏi danh sách nhưng giữ lại tài liệu đã upload.
     */
    @PostMapping("/{courseId}/leave")
    public ResponseEntity<Void> leave(@PathVariable UUID courseId) {
        courseService.leave(courseId);
        return ResponseEntity.noContent().build();
    }
}
