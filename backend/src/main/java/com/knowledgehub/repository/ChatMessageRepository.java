package com.knowledgehub.repository;

import com.knowledgehub.entity.ChatMessage;
import com.knowledgehub.entity.MessageRole;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    /**
     * Thời điểm các tin nhắn của người học trong workspace — dùng để dựng chuỗi
     * ngày học (navbar) mà không cần tải nội dung tin nhắn.
     */
    @Query("select m.createdAt from ChatMessage m where m.session.workspace.id = :workspaceId and m.role = :role")
    List<Instant> findUserMessageTimestamps(@Param("workspaceId") UUID workspaceId, @Param("role") MessageRole role);

    /**
     * Số tin nhắn của user trong workspace kể từ :since — dùng để quy ra số giờ
     * tutoring (mỗi lượt hỏi/đáp tính một khoảng thời gian cố định).
     */
    long countBySessionWorkspaceIdAndRoleAndCreatedAtGreaterThanEqual(
            UUID workspaceId, MessageRole role, Instant since);

    long countBySessionWorkspaceIdAndRole(UUID workspaceId, MessageRole role);
}
