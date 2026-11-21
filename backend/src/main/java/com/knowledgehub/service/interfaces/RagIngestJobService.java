package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.RagIngestJobCreateRequest;
import com.knowledgehub.dto.request.RagIngestJobUpdateRequest;
import com.knowledgehub.dto.response.RagIngestJobResponse;
import java.util.List;
import java.util.Optional;

/**
 * Hàng đợi ingest bền của luồng RAG (bảng {@code rag_ingest_jobs}).
 *
 * <p>
 * rag-service vẫn là nơi chạy worker; nó ghi/đọc trạng thái job qua đây để job
 * sống sót khi service restart.
 * </p>
 */
public interface RagIngestJobService {

    RagIngestJobResponse create(RagIngestJobCreateRequest request);

    Optional<RagIngestJobResponse> find(String jobId);

    List<RagIngestJobResponse> list(String status, int limit);

    /**
     * Lấy job queued cũ nhất và chuyển sang running (tương đương
     * {@code SELECT ... FOR UPDATE SKIP LOCKED}).
     */
    Optional<RagIngestJobResponse> reserveNext();

    RagIngestJobResponse update(String jobId, RagIngestJobUpdateRequest request);

    /**
     * Job đang running quá {@code staleAfterSeconds} được đưa lại về queued
     * (nếu còn lượt thử) hoặc failed. Trả về các job đã được xử lý.
     */
    List<RagIngestJobResponse> recoverStale(int staleAfterSeconds, int maxAttempts);
}
