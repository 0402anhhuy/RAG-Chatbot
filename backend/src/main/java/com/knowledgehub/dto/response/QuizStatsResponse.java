package com.knowledgehub.dto.response;

import java.util.List;

/**
 * Số liệu tổng hợp ở đầu tab Quizzes. Mọi con số đều đếm từ DB.
 *
 * @param averages theo đề (điểm trung bình các lượt đã nộp), dùng cho % thuật
 * toán
 */
public record QuizStatsResponse(
        long completedAssessments,
        Double averageScore,
        long reviewedQuestions,
        Double algorithmicPrecision,
        long totalQuizzes,
        long newQuizzes,
        long inProgressQuizzes,
        long completedQuizzes,
        List<QuizAverage> averages) {

    public record QuizAverage(String quizTitle, String courseCode, double averageScore, int attempts) {

    }
}
