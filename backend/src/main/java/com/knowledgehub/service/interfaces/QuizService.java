package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.QuizAttemptRequest;
import com.knowledgehub.dto.request.QuizCreateRequest;
import com.knowledgehub.dto.request.QuizUpdateRequest;
import com.knowledgehub.dto.response.QuizResponse;
import com.knowledgehub.dto.response.QuizStatsResponse;

import java.util.List;
import java.util.UUID;

/**
 * Đề kiểm tra của tab Quizzes (Academy Hub).
 *
 * @param status NEW | IN_PROGRESS | COMPLETED, null = tất cả
 * @param search khớp title / courseCode / courseTitle
 */
public interface QuizService {

    List<QuizResponse> getQuizzes(UUID ownerId, UUID workspaceId, UUID userId, String status, String search);

    QuizResponse getQuiz(UUID quizId, UUID userId);

    QuizStatsResponse getStats(UUID ownerId, UUID workspaceId, UUID userId);

    QuizResponse create(UUID ownerId, QuizCreateRequest request);

    QuizResponse update(UUID quizId, QuizUpdateRequest changes);

    void delete(UUID quizId);

    /**
     * Bắt đầu làm bài: mở một lượt mới (status chuyển IN_PROGRESS).
     */
    QuizResponse startAttempt(UUID quizId, UUID userId);

    /**
     * Nộp bài: ghi điểm và chuyển status COMPLETED.
     */
    QuizResponse submitAttempt(UUID quizId, UUID userId, QuizAttemptRequest request);
}
