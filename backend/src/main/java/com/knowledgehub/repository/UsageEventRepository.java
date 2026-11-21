package com.knowledgehub.repository;

import com.knowledgehub.entity.UsageEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface UsageEventRepository extends JpaRepository<UsageEvent, UUID> {

    /**
     * Toàn bộ lượt dùng của một project trong khoảng thời gian. Tab Analytics
     * chỉ đọc một lần rồi tự nhóm theo ngày / provider / user để tránh N+1
     * query.
     */
    List<UsageEvent> findByProjectIdAndOccurredAtBetweenOrderByOccurredAtAsc(
            UUID projectId, Instant from, Instant to);
}
