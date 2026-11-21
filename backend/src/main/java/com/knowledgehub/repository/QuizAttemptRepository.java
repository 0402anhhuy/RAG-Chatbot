package com.knowledgehub.repository;

import com.knowledgehub.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    List<QuizAttempt> findByQuizIdOrderByStartedAtDesc(UUID quizId);

    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(UUID userId);

    List<QuizAttempt> findByUserIdAndQuizWorkspaceIdOrderByStartedAtDesc(UUID userId, UUID workspaceId);

    Optional<QuizAttempt> findFirstByQuizIdAndUserIdOrderByStartedAtDesc(UUID quizId, UUID userId);

    Optional<QuizAttempt> findFirstByQuizIdAndUserIdAndSubmittedAtIsNullOrderByStartedAtDesc(
            UUID quizId, UUID userId);

    long countByUserIdAndSubmittedAtIsNotNull(UUID userId);

    long countByQuizId(UUID quizId);

    /**
     * Lượt đã nộp của một user trong một workspace kể từ :since — nguồn dữ liệu
     * duy nhất cho tab Analytics (mastery, skill matrix, knowledge gaps).
     */
    List<QuizAttempt> findByUserIdAndQuizWorkspaceIdAndSubmittedAtIsNotNullAndSubmittedAtGreaterThanEqualOrderBySubmittedAtDesc(
            UUID userId, UUID workspaceId, Instant since);

    /**
     * Như trên nhưng không giới hạn thời gian (range = full term).
     */
    List<QuizAttempt> findByUserIdAndQuizWorkspaceIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(
            UUID userId, UUID workspaceId);

    void deleteByQuizId(UUID quizId);
}
