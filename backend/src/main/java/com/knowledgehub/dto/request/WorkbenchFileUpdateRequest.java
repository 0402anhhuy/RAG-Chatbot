package com.knowledgehub.dto.request;

/**
 * Lưu nội dung editor. Bỏ trống content thì BE hiểu là "không đổi nội dung"
 * (dùng khi chỉ đổi tên/thư mục qua path).
 *
 * @param content nội dung mới
 * @param path đường dẫn mới nếu người dùng rename/move
 */
public record WorkbenchFileUpdateRequest(
        String content,
        String path) {

}
