package com.knowledgehub.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Một lượt chạy của công cụ học tập (tab Tools / Academy Hub).
 *
 * <p>
 * Mỗi lần bấm chạy trên một tool (tutor, exam_prep, grader, courseware) tạo một
 * bản ghi — đây là dữ liệu thật thay cho các con số đếm sẵn ở UI như "Module 4
 * active", "24 questions in pool".
 * </p>
 *
 * <p>
 * {@code outputJson} lưu kết quả do tool sinh ra (ví dụ bộ câu hỏi của đề luyện
 * thi) để xem lại được; kết quả lớn nên để TEXT và chỉ tóm tắt ở
 * {@code summary}.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "academy_tool_runs",
        indexes = @Index(name = "idx_academy_tool_run_user_tool", columnList = "user_id, tool_type"))
public class AcademyToolRun {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "workspace_id")
    private UUID workspaceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tool_type", nullable = false, length = 30)
    private AcademyToolType toolType;

    /**
     * queued | running | completed | failed
     */
    @Column(nullable = false, length = 20)
    private String status = "queued";

    /**
     * Một dòng mô tả kết quả ngắn gọn dùng cho card của tool.
     */
    @Column(length = 500)
    private String summary;

    @Column(name = "output_json", columnDefinition = "TEXT")
    private String outputJson;

    /**
     * Số tài liệu nguồn của lượt chạy.
     */
    @Column(name = "source_count", nullable = false)
    private int sourceCount;

    /**
     * Đề kiểm tra được tạo ra (chỉ có với tool exam_prep).
     */
    @Column(name = "quiz_id")
    private UUID quizId;

    /**
     * Tài liệu nguồn của lượt chạy; giữ để metric "N tài liệu đã dùng" luôn đọc
     * được mà không cần join bảng phụ.
     */
    @ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    @CollectionTable(
            name = "academy_tool_run_sources",
            joinColumns = @JoinColumn(name = "run_id"))
    @Column(name = "document_id", nullable = false)
    private Set<UUID> sourceDocumentIds = new LinkedHashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
