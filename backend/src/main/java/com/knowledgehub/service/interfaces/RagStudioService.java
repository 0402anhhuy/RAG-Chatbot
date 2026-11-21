package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.RagDocumentContextRequest;
import com.knowledgehub.dto.response.RagDocumentContextResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Các bước sinh nội dung study (flashcard/đề thi) chạy trên dữ liệu của BE.
 *
 * <p>
 * rag-service không còn giữ DB, nên nó tra cứu tài liệu và chunk qua đây, rồi
 * nhờ BE gọi LLM/embedding theo cấu hình mà người dùng đã chọn.
 * </p>
 */
public interface RagStudioService {

    RagDocumentContextResponse loadContext(RagDocumentContextRequest request);

    /** Sinh flashcard từ danh sách tài liệu trong workspace. */
    Map<String, Object> flashcards(String workspaceId, List<UUID> documentIds, int maxItems);

    /** Sinh câu hỏi trắc nghiệm từ danh sách tài liệu trong workspace. */
    Map<String, Object> exams(String workspaceId, List<UUID> documentIds, int maxItems);
}
