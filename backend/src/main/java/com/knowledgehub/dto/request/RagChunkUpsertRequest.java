package com.knowledgehub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

/**
 * Thay toàn bộ chunk của một tài liệu sau khi rag-service trích xuất xong.
 * Gửi danh sách rỗng tương đương xóa hết chunk cũ.
 */
public record RagChunkUpsertRequest(@NotNull List<Chunk> chunks) {

    public record Chunk(
            @NotBlank @Size(max = 128) String chunkId,
            @PositiveOrZero int chunkIndex,
            @NotBlank String content,
            Integer pageNumber,
            String sectionPath,
            @NotBlank @Size(max = 128) String checksum,
            Map<String, Object> metadata) {
    }
}
