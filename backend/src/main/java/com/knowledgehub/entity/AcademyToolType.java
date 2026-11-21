package com.knowledgehub.entity;

/**
 * Bốn công cụ học tập của tab Tools (Academy Hub). Giá trị {@link #id()} khớp
 * với {@code activeSubTool} của AcademyHub và {@code tools} của tab
 * Conversations.
 */
public enum AcademyToolType {

    /**
     * Gia sư hỏi đáp từng bước (Socratic) trên tài liệu đã chọn.
     */
    TUTOR("tutor", "Socratic Code Tutor", "SOCRATIC AI", "academic_tutor", true),
    /**
     * Sinh đề luyện thi từ tài liệu. Cần LLM nên mọi chạy đề đều lưu thành một
     * đề thật trong bảng quizzes, dùng lại tab Quizzes.
     */
    EXAM_PREP("exam_prep", "Exam & Quiz Prep", "ADAPTIVE DRILL", "exam_generator", true),
    /**
     * Chấm bài theo rubric. Chưa có LLM trong BE nên trả trạng thái
     * {@code queued} thay vì điểm giả.
     */
    GRADER("grader", "Assignment Grader", "AUTO RUBRIC", "assignment_grader", false),
    /**
     * Tra cứu trên đúng các tài liệu đã chọn — hoạt động được mà không cần LLM.
     */
    COURSEWARE("courseware", "Courseware RAG Index", "VECTOR RETRIEVAL", "courseware_rag", true);

    private final String id;
    private final String title;
    private final String badge;
    private final String promptScene;
    private final boolean runnable;

    AcademyToolType(String id, String title, String badge, String promptScene, boolean runnable) {
        this.id = id;
        this.title = title;
        this.badge = badge;
        this.promptScene = promptScene;
        this.runnable = runnable;
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getBadge() {
        return badge;
    }

    /**
     * Scene (task) gửi sang FastAPI RAG khi sinh nội dung.
     */
    public String getPromptScene() {
        return promptScene;
    }

    /**
     * true nếu BE hiện có thể tạo kết quả thật (không cần LLM bên ngoài).
     */
    public boolean isRunnable() {
        return runnable;
    }

    /**
     * Đọc tool từ {@code activeSubTool} của FE; không nhận diện được thì trả
     * null.
     */
    public static AcademyToolType fromId(String id) {
        if (id == null || id.isBlank()) {
            return null;
        }
        String normalized = id.trim().toLowerCase(java.util.Locale.ROOT).replace('-', '_');
        for (AcademyToolType type : values()) {
            if (type.id.equals(normalized)) {
                return type;
            }
        }
        return null;
    }
}
