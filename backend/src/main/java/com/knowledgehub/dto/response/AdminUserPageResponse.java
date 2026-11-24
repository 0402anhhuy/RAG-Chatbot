package com.knowledgehub.dto.response;

import java.util.List;

/** Trang kết quả tìm kiếm user cho màn hình quản trị. */
public record AdminUserPageResponse(
        List<UserResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    public static AdminUserPageResponse of(
            List<UserResponse> content, int page, int size, long totalElements, int totalPages) {
        return new AdminUserPageResponse(content, page, size, totalElements, totalPages);
    }
}
