package com.knowledgehub.repository;

import com.knowledgehub.entity.UsageEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    long countByOccurredAtAfter(Instant from);

    long countByOccurredAtBetween(Instant from, Instant to);

    @Query("select coalesce(sum(ue.totalTokens), 0) from UsageEvent ue")
    long sumTotalTokens();

    /**
     * Số lượt dùng LLM nhóm theo ngày (dành cho Admin Dashboard).
     */
    @Query(value = """
            select to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') as day, count(*)
            from usage_events
            where occurred_at >= :from
            group by 1
            order by 1
            """, nativeQuery = true)
    List<Object[]> countDailySince(@Param("from") Instant from);
}
