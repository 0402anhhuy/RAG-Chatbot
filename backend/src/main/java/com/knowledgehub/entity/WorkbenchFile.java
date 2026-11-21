package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Một file trong workspace của project, hiển thị ở cột Files của tab IDE.
 *
 * <p>
 * path là đường dẫn tương đối kiểu posix ("src/main/App.java") nên cây thư mục
 * được suy ra từ path thay vì lưu riêng từng folder. Nội dung file lưu trong
 * content để editor đọc/sửa và để tạo transcript khi tải transcript.
 * </p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "workbench_files",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_workbench_file_path",
                columnNames = {"project_id", "path"}),
        indexes = @Index(name = "idx_workbench_file_project", columnList = "project_id"))
public class WorkbenchFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /**
     * Đường dẫn tương đối trong workspace, luôn dùng dấu "/".
     */
    @Column(nullable = false, length = 500)
    private String path;

    /**
     * Tên file (phần cuối của path), lưu sẵn để sắp xếp và tìm kiếm.
     */
    @Column(nullable = false, length = 255)
    private String name;

    /**
     * Thư mục cha ("" nếu file nằm ở gốc workspace).
     */
    @Column(name = "parent_path", nullable = false, length = 500)
    private String parentPath = "";

    @Column(nullable = false, length = 20)
    private String extension = "";

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "line_count", nullable = false)
    private int lineCount;

    /**
     * true nếu người dùng sửa tay trên editor, false nếu AI sinh ra.
     */
    @Column(name = "edited_by_user", nullable = false)
    private boolean editedByUser;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
