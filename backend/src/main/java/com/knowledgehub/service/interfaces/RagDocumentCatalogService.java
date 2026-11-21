package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.RagChunkUpsertRequest;
import com.knowledgehub.dto.request.RagDocumentRegisterRequest;
import com.knowledgehub.dto.request.RagDocumentStatusUpdateRequest;
import com.knowledgehub.dto.response.RagChunkResponse;
import com.knowledgehub.dto.response.RagDocumentResponse;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Nghiệp vụ catalog tài liệu RAG (bảng {@code rag_documents} và
 * {@code rag_document_chunks}).
 *
 * <p>
 * Đây là phần dữ liệu duy nhất của luồng RAG còn nằm ở BE: trạng thái index,
 * checksum và text chunk. rag-service gọi các method này qua API nội bộ thay vì
 * tự mở kết nối DB.
 * </p>
 */
public interface RagDocumentCatalogService {

    RagDocumentResponse register(UUID documentId, RagDocumentRegisterRequest request);

    Optional<RagDocumentResponse> find(UUID documentId);

    List<RagDocumentResponse> list(String workspaceId, String status);

    RagDocumentResponse updateStatus(UUID documentId, RagDocumentStatusUpdateRequest request);

    void bindJob(UUID documentId, String jobId);

    /**
     * Thay toàn bộ chunk của tài liệu. Trả về số chunk đã lưu.
     *
     * @throws com.knowledgehub.service.exception.ServiceEntityNotFoundException
     *         khi tài liệu không còn trong catalog (đã bị xóa lúc đang index)
     */
    int replaceChunks(UUID documentId, RagChunkUpsertRequest request);

    List<RagChunkResponse> listChunks(List<UUID> documentIds, Integer limit);

    int countChunks(UUID documentId);

    /** Đánh dấu tài liệu đã xóa và xóa chunk của nó. */
    Optional<RagDocumentResponse> markDeleted(UUID documentId);
}
