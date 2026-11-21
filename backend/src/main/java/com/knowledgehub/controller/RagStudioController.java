package com.knowledgehub.controller;

import com.knowledgehub.dto.request.RagDocumentContextRequest;
import com.knowledgehub.dto.response.RagDocumentContextResponse;
import com.knowledgehub.service.interfaces.RagStudioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoint nội bộ để rag-service lấy dữ liệu tài liệu khi người dùng chạy công
 * cụ Studio (flashcard/đề thi) hoặc khi cần rebuild index.
 *
 * <p>
 * rag-service chỉ giữ phần RAG (chunking, embedding, retrieval, LLM); dữ liệu
 * nằm ở BE nên nó phải hỏi lại qua đây.
 * </p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rag")
public class RagStudioController {

    private final RagStudioService studioService;

    @PostMapping("/document-context")
    public ResponseEntity<RagDocumentContextResponse> documentContext(
            @Valid @RequestBody RagDocumentContextRequest request) {
        return ResponseEntity.ok(studioService.loadContext(request));
    }
}
