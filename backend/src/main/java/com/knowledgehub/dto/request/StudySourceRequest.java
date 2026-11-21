package com.knowledgehub.dto.request;

import java.util.UUID;

/**
 * Thêm nguồn vào conversation.
 *
 * @param documentId tài liệu đã có trong workspace (ưu tiên dùng cái này)
 * @param filename dùng khi client vừa upload xong một document và chỉ cần gắn
 * theo tên
 * @param checked bật nguồn ngay sau khi thêm (mặc định true)
 */
public record StudySourceRequest(
        UUID documentId,
        String filename,
        Boolean checked) {

}
