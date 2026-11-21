package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

/**
 * Lệnh (completion) mà rag-service gửi sang BE để chạy vòng RAG.
 *
 * <p>
 * Lý do tồn tại: LLM/embedding/retrieval là cấu hình thuần của rag-service,
 * nhưng quyền truy cập workspace và lịch sử hội thoại nằm ở BE. Vì vậy
 * rag-service tra cứu tài liệu trong catalog, rồi gọi endpoint này với câu hỏi +
 * lịch sử; BE dựng prompt, gọi provider và lưu câu trả lời vào conversation.
 * </p>
 */
public record RagIngestCommandRequest(
        @NotBlank String query,
        String workspaceId,
        List<String> documentIds,
        String conversationId,
        List<Message> chatHistory) {

    public record Message(String role, String content) {
    }

    /** Ngữ cảnh tài liệu mà BE cần để chạy chat khi không truyền documentIds. */
    public record Context(Map<String, Object> data) {
    }
}
