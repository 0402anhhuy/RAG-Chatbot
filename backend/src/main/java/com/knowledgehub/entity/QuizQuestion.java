package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Một câu hỏi trắc nghiệm. Đáp án lưu dạng chuỗi ngăn cách {@code |} để không
 * cần bảng con cho từng option, nhưng vẫn giữ đúng thứ tự A, B, C, D...
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "quiz_questions",
        indexes = @Index(name = "idx_quiz_question_quiz", columnList = "quiz_id"))
public class QuizQuestion {

    private static final String SEPARATOR = "|";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Column(columnDefinition = "TEXT")
    private String options;

    @Column(name = "correct_index", nullable = false)
    private int correctIndex;

    /**
     * Giải thích đáp án, hiện ở ô "RAG Context" sau khi kiểm tra.
     */
    @Column(columnDefinition = "TEXT")
    private String explanation;

    /**
     * Nguồn tham chiếu, vd "Lecture_04.pdf (Page 18)".
     */
    @Column(name = "rag_source", length = 255)
    private String ragSource;

    /**
     * Đáp án đã chọn của bài làm đầu tiên; nguồn dữ liệu cho "sample preview".
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private java.time.Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = java.time.Instant.now();
    }

    public List<String> optionList() {
        if (options == null || options.isBlank()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (String part : options.split("\\" + SEPARATOR, -1)) {
            result.add(part.trim());
        }
        return result;
    }

    public void setOptionList(List<String> values) {
        this.options = values == null ? "" : String.join(SEPARATOR, values);
    }
}
