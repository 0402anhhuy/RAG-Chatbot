package com.knowledgehub.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Toàn bộ dữ liệu của tab Home (Academy Hub), tổng hợp từ các tab khác: Courses
 * (tiến độ khóa), Quizzes (điểm/ lượt làm), Conversations + Study notes (giờ
 * học, ghi chú), Tools (lượt chạy gần nhất) và Settings (mục tiêu ngày).
 *
 * <p>
 * Tab Home không giữ số liệu riêng và không chép lại dữ liệu: mọi giá trị ở đây
 * được đếm/tính từ bản ghi thật của workspace, nên luôn khớp với các tab tương
 * ứng. Giá trị tỉ lệ trả về {@code null} khi chưa có dữ liệu để UI hiện "—"
 * thay vì 0% gây hiểu nhầm.
 * </p>
 *
 * @param streak chuỗi ngày học liên tiếp (tính từ hoạt động thật: lượt nộp
 * quiz, tin nhắn trợ lý, ghi chú, lượt chạy tool)
 * @param syllabus tổng hợp tình trạng vector hoá courseware của workspace
 * @param generatedAt thời điểm BE tính xong, để FE biết dữ liệu còn mới
 * @param greeting "morning" | "afternoon" | "evening"
 */
public record AcademyHomeResponse(
        String greeting,
        String learnerName,
        ContinueLearning continueLearning,
        StudyStreak streak,
        SyllabusVectorization syllabus,
        List<Kpi> kpis,
        List<CourseProgress> courses,
        List<Recommendation> recommendations,
        java.time.Instant generatedAt) {

    /**
     * Chuỗi ngày học liên tiếp, đếm ngược từ hôm nay (hoặc hôm qua nếu hôm nay
     * chưa học) dựa trên các ngày có hoạt động học tập.
     *
     * @param days số ngày liên tiếp; 0 = chưa học ngày nào
     * @param activeToday hôm nay đã có hoạt động chưa
     * @param lastActiveAt hoạt động học gần nhất
     */
    public record StudyStreak(
            int days,
            boolean activeToday,
            java.time.Instant lastActiveAt) {

    }

    /**
     * Tình trạng vector hoá courseware của workspace (tab Documents).
     *
     * @param indexed tài liệu đã sẵn sàng dùng làm ngữ cảnh (READY)
     * @param processing tài liệu đang xử lý/index
     * @param total tổng số tài liệu trong workspace
     */
    public record SyllabusVectorization(
            int indexed,
            int processing,
            int total) {

        public boolean ready() {
            return total == 0 || processing == 0;
        }
    }

    /**
     * Banner "Continue Learning": bài học nên làm tiếp.
     *
     * @param courseCode không còn khóa học nào thì null
     * @param step mô tả bước kế tiếp, ví dụ "Lesson 12 of 20"
     */
    public record ContinueLearning(
            UUID courseId,
            String courseCode,
            String courseTitle,
            String nextLesson,
            String step,
            int progress) {

        public boolean present() {
            return courseId != null;
        }
    }

    /**
     * Một thẻ KPI ở đầu trang.
     *
     * @param id active_courses | average_mastery | quizzes_solved | study_time
     * @param value chuỗi đã format sẵn ("6", "89%", "18.4h", "—")
     * @param note dòng chú thích dưới giá trị; nội dung do BE tính
     * @param detail tab nên mở khi người học bấm thẻ
     */
    public record Kpi(
            String id,
            String label,
            String value,
            String note,
            String detail,
            Double valueNumber,
            boolean hasData) {

    }

    /**
     * Một dòng "Current Syllabus Progress".
     *
     * @param nextLesson bài kế tiếp, null khi khóa đã học xong
     */
    public record CourseProgress(
            UUID courseId,
            String code,
            String title,
            int progress,
            String nextLesson,
            int completedLessons,
            int totalLessons,
            int docsCount) {

    }

    /**
     * Một gợi ý trong "Instant AI Drill & Mock Exam".
     *
     * @param toolId tutor | exam_prep | grader | courseware
     * @param detail dòng phụ (số câu, thời lượng, nguồn...)
     * @param sourceCourseCode mã môn liên quan, null nếu không gắn môn nào
     */
    public record Recommendation(
            String id,
            String title,
            String detail,
            String toolId,
            String sourceCourseCode) {

    }
}
