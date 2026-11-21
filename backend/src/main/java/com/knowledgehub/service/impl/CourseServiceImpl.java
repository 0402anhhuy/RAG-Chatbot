package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.CourseCreateRequest;
import com.knowledgehub.dto.request.CourseUpdateRequest;
import com.knowledgehub.dto.response.CourseResponse;
import com.knowledgehub.entity.Course;
import com.knowledgehub.entity.Document;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.Workspace;
import com.knowledgehub.repository.CourseRepository;
import com.knowledgehub.repository.DocumentRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.repository.WorkspaceRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {

    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_IN_PROGRESS = "in_progress";
    private static final int DEFAULT_THRESHOLD = 80;

    private final CourseRepository courseRepository;
    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> getCourses(UUID ownerId, UUID workspaceId, String status, String search) {
        List<Course> courses;
        if (workspaceId != null) {
            courses = courseRepository.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId);
        } else if (ownerId != null) {
            courses = courseRepository.findByWorkspaceOwnerIdOrderByCreatedAtAsc(ownerId);
        } else {
            throw new IllegalArgumentException("ownerId or workspaceId is required");
        }

        String keyword = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String normalizedStatus = normalizeStatus(status);

        return courses.stream()
                .filter(course -> !course.isArchived())
                .filter(course -> matches(course, keyword))
                .map(this::toResponse)
                .filter(response -> normalizedStatus == null || response.status().equals(normalizedStatus))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponse getCourse(UUID courseId) {
        return toResponse(findCourse(courseId));
    }

    @Override
    public CourseResponse create(UUID ownerId, CourseCreateRequest request) {
        Workspace workspace = resolveWorkspace(ownerId, request.workspaceId());

        String code = request.code() == null ? "" : request.code().trim();
        if (code.isEmpty()) {
            throw new IllegalArgumentException("code is required");
        }
        if (courseRepository.existsByWorkspaceIdAndCodeIgnoreCase(workspace.getId(), code)) {
            throw new IllegalArgumentException("You already joined a course with code " + code);
        }

        int total = request.totalLessons() != null ? request.totalLessons() : 0;
        int completed = request.completedLessons() != null ? request.completedLessons() : 0;

        Course course = new Course();
        course.setWorkspace(workspace);
        course.setCode(code.toUpperCase(Locale.ROOT));
        course.setTitle(request.title().trim());
        course.setSemester(trimToNull(request.semester()));
        course.setInstructor(trimToNull(request.instructor()));
        course.setDescription(trimToNull(request.description()));
        course.setTotalLessons(total);
        course.setCompletedLessons(Math.min(completed, total));
        course.setCompletionThreshold(DEFAULT_THRESHOLD);

        return toResponse(courseRepository.save(course));
    }

    @Override
    public CourseResponse update(UUID courseId, CourseUpdateRequest changes) {
        Course course = findCourse(courseId);

        if (changes.code() != null && !changes.code().isBlank()) {
            String code = changes.code().trim().toUpperCase(Locale.ROOT);
            UUID workspaceId = course.getWorkspace().getId();
            courseRepository.findByWorkspaceIdAndCodeIgnoreCase(workspaceId, code)
                    .filter(other -> !other.getId().equals(course.getId()))
                    .ifPresent(other -> {
                        throw new IllegalArgumentException("Another course already uses code " + code);
                    });
            course.setCode(code);
        }
        if (changes.title() != null && !changes.title().isBlank()) {
            course.setTitle(changes.title().trim());
        }
        if (changes.semester() != null) {
            course.setSemester(trimToNull(changes.semester()));
        }
        if (changes.instructor() != null) {
            course.setInstructor(trimToNull(changes.instructor()));
        }
        if (changes.description() != null) {
            course.setDescription(trimToNull(changes.description()));
        }
        if (changes.totalLessons() != null) {
            course.setTotalLessons(changes.totalLessons());
        }
        if (changes.completedLessons() != null) {
            course.setCompletedLessons(changes.completedLessons());
        }
        if (changes.completionThreshold() != null) {
            course.setCompletionThreshold(changes.completionThreshold());
        }
        if (changes.archived() != null) {
            course.setArchived(changes.archived());
        }

        return toResponse(courseRepository.save(course));
    }

    @Override
    public void delete(UUID courseId) {
        courseRepository.delete(findCourse(courseId));
    }

    @Override
    public void leave(UUID courseId) {
        // Giữ bản ghi và tài liệu, chỉ ẩn khỏi danh sách khóa học của người dùng.
        Course course = findCourse(courseId);
        course.setArchived(true);
        courseRepository.save(course);
    }

    // ---------------------------------------------------------------- helpers
    private CourseResponse toResponse(Course course) {
        // Tài liệu của khóa = document cùng workspace có courseCode trùng code.
        List<Document> materials = documentRepository
                .findByWorkspaceIdAndCourseCodeOrderByCreatedAtDesc(
                        course.getWorkspace().getId(), course.getCode());
        return CourseResponse.from(course, materials);
    }

    private boolean matches(Course course, String keyword) {
        if (keyword.isEmpty()) {
            return true;
        }
        boolean codeOk = course.getCode() != null
                && course.getCode().toLowerCase(Locale.ROOT).contains(keyword);
        boolean titleOk = course.getTitle() != null
                && course.getTitle().toLowerCase(Locale.ROOT).contains(keyword);
        boolean instructorOk = course.getInstructor() != null
                && course.getInstructor().toLowerCase(Locale.ROOT).contains(keyword);
        return codeOk || titleOk || instructorOk;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return switch (status.trim().toLowerCase(Locale.ROOT)) {
            case STATUS_COMPLETED ->
                STATUS_COMPLETED;
            case STATUS_IN_PROGRESS, "in-progress", "inprogress" ->
                STATUS_IN_PROGRESS;
            default ->
                null;
        };
    }

    /**
     * Không truyền workspaceId thì lấy workspace đầu tiên của owner; owner chưa
     * có workspace nào thì tạo mới ngay, để lần đăng ký khóa đầu tiên vẫn chạy.
     */
    private Workspace resolveWorkspace(UUID ownerId, UUID workspaceId) {
        if (workspaceId != null) {
            return workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + workspaceId));
        }
        if (ownerId == null) {
            throw new IllegalArgumentException("ownerId is required");
        }
        List<Workspace> owned = workspaceRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
        if (!owned.isEmpty()) {
            return owned.get(0);
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + ownerId));
        Workspace workspace = new Workspace();
        workspace.setName("Academy");
        workspace.setDescription("Study workspace for the Academy Hub");
        workspace.setOwner(owner);
        return workspaceRepository.save(workspace);
    }

    private Course findCourse(UUID courseId) {
        if (courseId == null) {
            throw new IllegalArgumentException("courseId is required");
        }
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Course not found: " + courseId));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
