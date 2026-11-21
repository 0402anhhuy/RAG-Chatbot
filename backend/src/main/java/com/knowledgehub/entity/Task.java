package com.knowledgehub.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status = TaskStatus.BACKLOG;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Column(columnDefinition = "TEXT")
    private String labels;

    @Column(name = "story_points", length = 50)
    private String storyPoints;

    @Column(name = "original_estimate", length = 50)
    private String originalEstimate;

    @Column(name = "remaining_estimate", length = 50)
    private String remainingEstimate;

    @Column(nullable = false)
    private int position;

    /**
     * Khoá lạc quan: reorder kéo-thả ghi vị trí cho cả cột nên cần biết bản ghi
     * đã bị client khác sửa hay chưa.
     */
    @Version
    @Column(nullable = false)
    private long version;

    @Column(nullable = false)
    private boolean archived;

    /**
     * Kéo sang cột khác phải đứng cuối cột mới, và thứ tự trong cột được người dùng
     * sắp xếp. So sánh theo cột trước rồi mới tới position để lần đọc đầu tiên
     * (mọi bản ghi còn position = 0) vẫn giữ thứ tự theo updatedAt như cũ.
     */
    /**
     * Đổi cột và ghi nhận mốc hoàn thành: vào COMPLETED thì set completedAt, rời
     * COMPLETED thì xoá đi để "Completed today" ở Dashboard luôn đúng.
     */
    public void changeStatus(TaskStatus next) {
        if (next == null || next == status) {
            return;
        }
        status = next;
        if (next == TaskStatus.COMPLETED) {
            completedAt = Instant.now();
        } else {
            completedAt = null;
        }
    }

    public static int compareForBoard(Task left, Task right) {
        int byPosition = Integer.compare(left.getPosition(), right.getPosition());
        if (byPosition != 0) {
            return byPosition;
        }
        if (left.getUpdatedAt() != null && right.getUpdatedAt() != null) {
            return right.getUpdatedAt().compareTo(left.getUpdatedAt());
        }
        return 0;
    }

    @Column(name = "archived_at")
    private Instant archivedAt;

    /**
     * Lúc task được đưa sang COMPLETED. Dùng để đếm "Completed today" ở tab
     * Dashboard; giữ null với task chưa xong.
     */
    @Column(name = "completed_at")
    private Instant completedAt;

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
