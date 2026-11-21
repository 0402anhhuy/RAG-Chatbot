package com.knowledgehub.controller.academyhub;

import com.knowledgehub.dto.request.QuizAttemptRequest;
import com.knowledgehub.dto.request.QuizCreateRequest;
import com.knowledgehub.dto.request.QuizUpdateRequest;
import com.knowledgehub.dto.response.QuizResponse;
import com.knowledgehub.dto.response.QuizStatsResponse;
import com.knowledgehub.service.interfaces.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Đề kiểm tra của tab Quizzes (Academy Hub).
 *
 * <p>
 * status/score/lastAttempt được BE suy ra từ các lượt làm của {@code userId}
 * truyền vào, nên UI chỉ cần hiển thị, không tự tính.
 * </p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/quizzes")
public class AcademyQuizController {

    private final QuizService quizService;

    /**
     * Danh sách đề. Truyền workspaceId hoặc ownerId (FE chưa chắc biết
     * workspace).
     *
     * @param status NEW | IN_PROGRESS | COMPLETED, để trống = tất cả
     * @param userId để tính điểm / lượt làm của riêng người này
     */
    @GetMapping
    public ResponseEntity<List<QuizResponse>> list(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(quizService.getQuizzes(ownerId, workspaceId, userId, status, search));
    }

    /**
     * Số liệu ở thanh "Quick Metrics" đầu tab.
     */
    @GetMapping("/stats")
    public ResponseEntity<QuizStatsResponse> stats(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) UUID userId) {
        return ResponseEntity.ok(quizService.getStats(ownerId, workspaceId, userId));
    }

    @GetMapping("/{quizId}")
    public ResponseEntity<QuizResponse> get(
            @PathVariable UUID quizId,
            @RequestParam(required = false) UUID userId) {
        return ResponseEntity.ok(quizService.getQuiz(quizId, userId));
    }

    /**
     * Tạo đề mới kèm danh sách câu hỏi.
     */
    @PostMapping
    public ResponseEntity<QuizResponse> create(
            @RequestParam(required = false) UUID ownerId,
            @Valid @RequestBody QuizCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(quizService.create(ownerId, request));
    }

    @PatchMapping("/{quizId}")
    public ResponseEntity<QuizResponse> update(
            @PathVariable UUID quizId,
            @Valid @RequestBody QuizUpdateRequest changes) {
        return ResponseEntity.ok(quizService.update(quizId, changes));
    }

    @DeleteMapping("/{quizId}")
    public ResponseEntity<Void> delete(@PathVariable UUID quizId) {
        quizService.delete(quizId);
        return ResponseEntity.noContent().build();
    }

    /**
     * "Start Full Assessment" — mở một lượt làm mới.
     */
    @PostMapping("/{quizId}/attempts")
    public ResponseEntity<QuizResponse> startAttempt(
            @PathVariable UUID quizId,
            @RequestParam UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(quizService.startAttempt(quizId, userId));
    }

    /**
     * Nộp bài: ghi điểm và chuyển đề sang COMPLETED.
     */
    @PostMapping("/{quizId}/attempts/submit")
    public ResponseEntity<QuizResponse> submitAttempt(
            @PathVariable UUID quizId,
            @RequestParam UUID userId,
            @RequestBody(required = false) QuizAttemptRequest request) {
        return ResponseEntity.ok(quizService.submitAttempt(quizId, userId, request));
    }
}
