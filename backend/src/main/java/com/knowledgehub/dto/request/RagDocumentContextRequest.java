package com.knowledgehub.dto.request;

import java.util.List;

/**
 * rag-service hỏi BE hai việc trước khi sinh flashcard/đề thi:
 *
 * <ul>
 *   <li>{@code readyDocumentIds}: tài liệu nào của workspace đã index xong; nếu
 *   client có gửi danh sách giới hạn thì chỉ trả về phần giao.</li>
 *   <li>{@code chunks}: text của các tài liệu đó để đưa vào prompt.</li>
 * </ul>
 */
public record RagDocumentContextRequest(
        String workspaceId,
        List<String> documentIds,
        Integer maxChars) {
}
