package com.knowledgehub.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Số liệu tab Analytics của Academy Hub, tính từ các lượt làm bài đã nộp
 * (QuizAttempt) và hoạt động học tập (tin nhắn, ghi chú, khóa học).
 *
 * <p>
 * Các giá trị tỉ lệ trả về null khi chưa có dữ liệu trong khoảng thời gian đang
 * chọn, để UI hiện "—" thay vì 0% gây hiểu nhầm.
 * </p>
 *
 * @param range 7d | 30d | all
 * @param deltaMastery chênh lệch điểm so với nửa đầu của khoảng, null nếu chưa
 * đủ dữ liệu
 */
public record LearningAnalyticsResponse(
        String range,
        String rangeLabel,
        Summary summary,
        List<Skill> skills,
        List<RecentScore> recentScores,
        List<KnowledgeGap> knowledgeGaps) {

    /**
     * Bốn thẻ KPI đầu trang.
     */
    public record Summary(
            Double overallMastery,
            Double deltaMastery,
            Double tutoringHours,
            Double deltaTutoringHours,
            Double assessmentAccuracy,
            long evaluatedQuestions,
            int gapCount,
            int highPriorityGaps,
            int quizzesTaken,
            long notesCount,
            long coursesCount) {

    }

    /**
     * Một dòng trong "Technical Competency Breakdown".
     *
     * @param status Advanced (>=80) | Proficient (>=60) | Needs Practice
     * @param color mã màu do BE chọn theo mastery để thanh meter luôn đồng bộ
     */
    public record Skill(
            String courseCode,
            String courseTitle,
            String skill,
            int mastery,
            String status,
            String color,
            int attempts) {

    }

    /**
     * Một dòng trong "Recent Assessment Scores".
     *
     * @param delta chênh lệch so với lượt trước của cùng đề, "%"; null nếu là
     * lượt đầu
     */
    public record RecentScore(
            UUID attemptId,
            UUID quizId,
            String exam,
            int score,
            String date,
            Double delta) {

    }

    /**
     * Một thẻ trong "Knowledge Gap Detection Engine".
     *
     * @param impact High | Medium | Low
     * @param suggestedTool id công cụ gợi ý (tutor | exam_prep)
     */
    public record KnowledgeGap(
            UUID quizId,
            String courseCode,
            String topic,
            String impact,
            String reason,
            String suggestedTool) {

    }
}
