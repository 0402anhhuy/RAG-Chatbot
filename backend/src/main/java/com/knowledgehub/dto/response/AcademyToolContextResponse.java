package com.knowledgehub.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Ngữ cảnh mở một tool: tài liệu người học có thể chọn làm nguồn, cùng vài
 * thống kê nhỏ để workspace hiển thị được trạng thái thật.
 *
 * <p>
 * Nguồn chỉ gồm tài liệu thuộc workspace của user — tool không bao giờ đọc file
 * của người khác.
 * </p>
 *
 * @param indexedCount số tài liệu đã index xong (status READY)
 * @param courseCodes danh sách mã môn có tài liệu, dùng cho bộ lọc nguồn
 */
public record AcademyToolContextResponse(
        String toolId,
        String title,
        List<SourceDocument> sources,
        int indexedCount,
        int totalCount,
        List<String> courseCodes) {

    /**
     * Một tài liệu có thể chọn làm nguồn.
     *
     * @param ready đã index xong, sẵn sàng được dùng
     * @param chunkCount số đoạn văn bản đã tách — dùng cho dòng "N đoạn"
     */
    public record SourceDocument(
            UUID id,
            String name,
            String courseCode,
            String fileType,
            String size,
            boolean ready,
            int chunkCount) {

    }
}
