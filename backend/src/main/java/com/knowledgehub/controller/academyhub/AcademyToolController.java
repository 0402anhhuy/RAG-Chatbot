package com.knowledgehub.controller.academyhub;

import com.knowledgehub.dto.request.AcademyToolRunRequest;
import com.knowledgehub.dto.response.AcademyToolContextResponse;
import com.knowledgehub.dto.response.AcademyToolsResponse;
import com.knowledgehub.service.interfaces.AcademyToolService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Công cụ học tập của tab Tools (Academy Hub).
 *
 * <p>
 * Catalog và ngữ cảnh trả dữ liệu thật từ DB; chạy tool tạo một lượt chạy
 * (academy_tool_runs) và trả kết quả của chính lượt đó.
 * </p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users/{userId}/academy-tools")
public class AcademyToolController {

    private final AcademyToolService academyToolService;

    /**
     * 4 card công cụ kèm số liệu thật (số nguồn đã index, số lượt chạy, lần
     * chạy gần nhất).
     */
    @GetMapping
    public ResponseEntity<AcademyToolsResponse> getTools(@PathVariable UUID userId) {
        return ResponseEntity.ok(academyToolService.getTools(userId));
    }

    /**
     * Ngữ cảnh mở một tool: tài liệu có thể chọn làm nguồn.
     */
    @GetMapping("/{toolId}/context")
    public ResponseEntity<AcademyToolContextResponse> getContext(
            @PathVariable UUID userId,
            @PathVariable String toolId,
            @RequestParam(required = false) UUID workspaceId) {
        return ResponseEntity.ok(academyToolService.getContext(userId, toolId, workspaceId));
    }

    /**
     * Chạy tool. toolId: tutor | exam_prep | grader | courseware.
     */
    @PostMapping("/{toolId}/run")
    public ResponseEntity<AcademyToolsResponse.RunResult> run(
            @PathVariable UUID userId,
            @PathVariable String toolId,
            @RequestParam(required = false) UUID workspaceId,
            @Valid @RequestBody(required = false) AcademyToolRunRequest request) {
        return ResponseEntity.ok(academyToolService.run(
                userId, toolId, workspaceId, request == null ? emptyRequest() : request));
    }

    /**
     * Mở lại kết quả lượt chạy gần nhất (204 nếu chưa chạy lần nào).
     */
    @GetMapping("/{toolId}/latest")
    public ResponseEntity<AcademyToolsResponse.RunResult> getLatestRun(
            @PathVariable UUID userId,
            @PathVariable String toolId) {
        AcademyToolsResponse.RunResult result = academyToolService.getLatestRun(userId, toolId);
        return result == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(result);
    }

    /**
     * Các lượt chạy gần đây của tool — tab Home dùng để biết lần luyện tập gần
     * nhất và kết quả của nó.
     *
     * @param limit số lượt tối đa, 1..50 (mặc định 20)
     */
    @GetMapping("/{toolId}/runs")
    public ResponseEntity<List<AcademyToolsResponse.RunResult>> listRuns(
            @PathVariable UUID userId,
            @PathVariable String toolId,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(academyToolService.listRuns(userId, toolId, limit));
    }

    private AcademyToolRunRequest emptyRequest() {
        return new AcademyToolRunRequest(null, null, null, null, null);
    }
}
